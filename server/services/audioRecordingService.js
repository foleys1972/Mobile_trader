const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const nodemailer = require('nodemailer');
const archiver = require('archiver');
const logger = require('../utils/logger');
const { getWorker, getRouter } = require('./mediaSoupService');

const pipelineAsync = promisify(pipeline);

class AudioRecordingService {
  constructor() {
    this.recordings = new Map(); // Active recordings
    this.retentionPolicies = new Map(); // Per-group retention policies
    this.emailConfig = this.initializeEmailConfig();
    this.recordingConfig = {
      outputDir: process.env.RECORDING_OUTPUT_DIR || './recordings',
      format: 'wav',
      sampleRate: 48000,
      channels: 2,
      bitDepth: 16,
      encryption: process.env.RECORDING_ENCRYPTION === 'true',
      retentionDays: parseInt(process.env.RECORDING_RETENTION_DAYS) || 2555, // 7 years default
      emailDelivery: process.env.RECORDING_EMAIL_DELIVERY === 'true',
      maxEmailSize: parseInt(process.env.MAX_EMAIL_SIZE_MB) || 25, // 25MB default
    };
    
    this.ensureOutputDirectory();
    this.setupRetentionScheduler();
  }

  initializeEmailConfig() {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      from: process.env.SMTP_FROM || 'noreply@trading-intercom.com',
      enabled: process.env.SMTP_ENABLED === 'true',
    };
  }

  setupRetentionScheduler() {
    // Run retention cleanup every hour
    setInterval(() => {
      this.processRetentionPolicies();
    }, 60 * 60 * 1000);

    // Run email delivery every 5 minutes
    if (this.recordingConfig.emailDelivery) {
      setInterval(() => {
        this.processEmailDelivery();
      }, 5 * 60 * 1000);
    }
  }

  async ensureOutputDirectory() {
    try {
      await fs.ensureDir(this.recordingConfig.outputDir);
      await fs.ensureDir(path.join(this.recordingConfig.outputDir, 'raw'));
      await fs.ensureDir(path.join(this.recordingConfig.outputDir, 'processed'));
      await fs.ensureDir(path.join(this.recordingConfig.outputDir, 'metadata'));
    } catch (error) {
      logger.error('Failed to create recording directories:', error);
      throw error;
    }
  }

  async startRecording(sessionId, groupId, userId, metadata = {}) {
    try {
      const recordingId = this.generateRecordingId();
      const timestamp = new Date().toISOString();
      
      // Get retention policy for this group
      const retentionPolicy = this.getRetentionPolicy(groupId);
      
      const recordingSession = {
        id: recordingId,
        sessionId,
        groupId,
        userId,
        startTime: timestamp,
        endTime: null,
        duration: 0,
        retentionPolicy,
        emailDelivery: this.getEmailDeliveryConfig(groupId),
        metadata: {
          ...metadata,
          serverId: process.env.SERVER_ID || 'default',
          recordingFormat: this.recordingConfig.format,
          sampleRate: this.recordingConfig.sampleRate,
          channels: this.recordingConfig.channels,
          bitDepth: this.recordingConfig.bitDepth,
          encryption: this.recordingConfig.encryption,
          retentionDays: retentionPolicy.retentionDays,
          emailDelivery: this.getEmailDeliveryConfig(groupId),
        },
        filePath: path.join(this.recordingConfig.outputDir, 'raw', `${recordingId}.wav`),
        metadataPath: path.join(this.recordingConfig.outputDir, 'metadata', `${recordingId}.json`),
        isActive: true,
        audioStream: null,
        participants: new Set([userId]),
        emailSent: false,
        retentionExpiry: new Date(Date.now() + (retentionPolicy.retentionDays * 24 * 60 * 60 * 1000)),
      };

      // Create audio stream for recording
      const audioStream = createWriteStream(recordingSession.filePath);
      recordingSession.audioStream = audioStream;

      // Save initial metadata
      await this.saveRecordingMetadata(recordingSession);

      this.recordings.set(recordingId, recordingSession);
      
      logger.info(`Started recording ${recordingId} for user ${userId} in group ${groupId}`);
      
      return {
        recordingId,
        startTime: timestamp,
        filePath: recordingSession.filePath,
      };
    } catch (error) {
      logger.error('Failed to start recording:', error);
      throw error;
    }
  }

  async addParticipantToRecording(recordingId, userId) {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    recording.participants.add(userId);
    recording.metadata.participants = Array.from(recording.participants);
    
    await this.saveRecordingMetadata(recording);
    logger.info(`Added participant ${userId} to recording ${recordingId}`);
  }

  async removeParticipantFromRecording(recordingId, userId) {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    recording.participants.delete(userId);
    recording.metadata.participants = Array.from(recording.participants);
    
    await this.saveRecordingMetadata(recording);
    logger.info(`Removed participant ${userId} from recording ${recordingId}`);
  }

  async processAudioChunk(recordingId, audioData, timestamp, userId) {
    const recording = this.recordings.get(recordingId);
    if (!recording || !recording.isActive) {
      return;
    }

    try {
      // Add timestamp and user metadata to audio chunk
      const chunkMetadata = {
        timestamp,
        userId,
        sequenceNumber: recording.metadata.sequenceNumber || 0,
        chunkSize: audioData.length,
      };

      recording.metadata.sequenceNumber = (recording.metadata.sequenceNumber || 0) + 1;

      // Write audio data with metadata
      if (recording.audioStream && !recording.audioStream.destroyed) {
        recording.audioStream.write(audioData);
      }

      // Update recording duration
      recording.duration = Date.now() - new Date(recording.startTime).getTime();
      
      // Periodically save metadata updates
      if (recording.metadata.sequenceNumber % 100 === 0) {
        await this.saveRecordingMetadata(recording);
      }
    } catch (error) {
      logger.error('Failed to process audio chunk:', error);
    }
  }

  async stopRecording(recordingId, reason = 'manual') {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    try {
      recording.endTime = new Date().toISOString();
      recording.duration = Date.now() - new Date(recording.startTime).getTime();
      recording.isActive = false;
      recording.metadata.endReason = reason;

      // Close audio stream
      if (recording.audioStream && !recording.audioStream.destroyed) {
        recording.audioStream.end();
      }

      // Save final metadata
      await this.saveRecordingMetadata(recording);

      // Process and encrypt recording if needed
      await this.postProcessRecording(recording);

      // Remove from active recordings
      this.recordings.delete(recordingId);

      logger.info(`Stopped recording ${recordingId}, duration: ${recording.duration}ms`);
      
      return {
        recordingId,
        duration: recording.duration,
        filePath: recording.filePath,
        participants: Array.from(recording.participants),
      };
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      throw error;
    }
  }

  async postProcessRecording(recording) {
    try {
      const processedPath = path.join(
        this.recordingConfig.outputDir, 
        'processed', 
        `${recording.id}.wav`
      );

      // Copy to processed directory
      await fs.copy(recording.filePath, processedPath);

      // Encrypt if required
      if (this.recordingConfig.encryption) {
        await this.encryptRecording(processedPath);
      }

      // Create compliance report
      await this.createComplianceReport(recording);

      logger.info(`Post-processed recording ${recording.id}`);
    } catch (error) {
      logger.error('Failed to post-process recording:', error);
    }
  }

  async encryptRecording(filePath) {
    try {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      const encryptedPath = filePath + '.enc';
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(encryptedPath);
      
      await pipelineAsync(input, cipher, output);
      
      // Save encryption metadata
      const keyPath = filePath + '.key';
      await fs.writeFile(keyPath, JSON.stringify({
        key: key.toString('hex'),
        iv: iv.toString('hex'),
        algorithm: 'aes-256-cbc',
        timestamp: new Date().toISOString(),
      }));

      // Remove unencrypted file
      await fs.remove(filePath);
      
      logger.info(`Encrypted recording: ${encryptedPath}`);
    } catch (error) {
      logger.error('Failed to encrypt recording:', error);
      throw error;
    }
  }

  async createComplianceReport(recording) {
    try {
      const report = {
        recordingId: recording.id,
        sessionId: recording.sessionId,
        groupId: recording.groupId,
        startTime: recording.startTime,
        endTime: recording.endTime,
        duration: recording.duration,
        participants: Array.from(recording.participants),
        metadata: recording.metadata,
        compliance: {
          retentionPeriod: this.recordingConfig.retentionDays,
          encryptionEnabled: this.recordingConfig.encryption,
          regulatoryCompliance: {
            mifidII: true,
            doddFrank: true,
            sox: true,
          },
          auditTrail: {
            created: new Date().toISOString(),
            serverId: process.env.SERVER_ID || 'default',
            version: '1.0.0',
          },
        },
      };

      const reportPath = path.join(
        this.recordingConfig.outputDir,
        'metadata',
        `${recording.id}-compliance.json`
      );

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      logger.info(`Created compliance report for recording ${recording.id}`);
    } catch (error) {
      logger.error('Failed to create compliance report:', error);
    }
  }

  async saveRecordingMetadata(recording) {
    try {
      const metadata = {
        ...recording.metadata,
        participants: Array.from(recording.participants),
        duration: recording.duration,
        isActive: recording.isActive,
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(recording.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.error('Failed to save recording metadata:', error);
    }
  }

  generateRecordingId() {
    return `rec_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  getActiveRecordings() {
    return Array.from(this.recordings.values()).filter(r => r.isActive);
  }

  getRecording(recordingId) {
    return this.recordings.get(recordingId);
  }

  async getRecordingStats() {
    const activeRecordings = this.getActiveRecordings();
    const totalDuration = activeRecordings.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      activeRecordings: activeRecordings.length,
      totalDuration,
      participants: new Set(activeRecordings.flatMap(r => Array.from(r.participants))).size,
      storageUsed: await this.calculateStorageUsage(),
    };
  }

  async calculateStorageUsage() {
    try {
      const stats = await fs.stat(this.recordingConfig.outputDir);
      return {
        totalSize: stats.size,
        recordingsCount: (await fs.readdir(path.join(this.recordingConfig.outputDir, 'raw'))).length,
      };
    } catch (error) {
      logger.error('Failed to calculate storage usage:', error);
      return { totalSize: 0, recordingsCount: 0 };
    }
  }

  async cleanupOldRecordings() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.recordingConfig.retentionDays);
      
      const rawDir = path.join(this.recordingConfig.outputDir, 'raw');
      const processedDir = path.join(this.recordingConfig.outputDir, 'processed');
      const metadataDir = path.join(this.recordingConfig.outputDir, 'metadata');
      
      const dirs = [rawDir, processedDir, metadataDir];
      
      for (const dir of dirs) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.remove(filePath);
            logger.info(`Cleaned up old recording file: ${filePath}`);
          }
        }
      }
      
      logger.info('Cleanup of old recordings completed');
    } catch (error) {
      logger.error('Failed to cleanup old recordings:', error);
    }
  }

  // Retention Policy Management
  setRetentionPolicy(groupId, policy) {
    this.retentionPolicies.set(groupId, {
      retentionDays: policy.retentionDays || this.recordingConfig.retentionDays,
      emailDelivery: policy.emailDelivery || false,
      emailRecipients: policy.emailRecipients || [],
      emailSchedule: policy.emailSchedule || 'immediate', // immediate, daily, weekly
      lastEmailSent: null,
      createdAt: new Date(),
    });
    
    logger.info(`Set retention policy for group ${groupId}: ${policy.retentionDays} days`);
  }

  getRetentionPolicy(groupId) {
    return this.retentionPolicies.get(groupId) || {
      retentionDays: this.recordingConfig.retentionDays,
      emailDelivery: false,
      emailRecipients: [],
      emailSchedule: 'immediate',
    };
  }

  getEmailDeliveryConfig(groupId) {
    const policy = this.getRetentionPolicy(groupId);
    return {
      enabled: policy.emailDelivery,
      recipients: policy.emailRecipients,
      schedule: policy.emailSchedule,
    };
  }

  async processRetentionPolicies() {
    try {
      const now = new Date();
      
      for (const [groupId, policy] of this.retentionPolicies) {
        const recordings = await this.getRecordingsByGroup(groupId);
        
        for (const recording of recordings) {
          if (recording.retentionExpiry && recording.retentionExpiry < now) {
            await this.deleteRecording(recording.id);
            logger.info(`Deleted expired recording ${recording.id} for group ${groupId}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process retention policies:', error);
    }
  }

  async processEmailDelivery() {
    try {
      if (!this.emailConfig.enabled || !this.recordingConfig.emailDelivery) {
        return;
      }

      const recordings = await this.getCompletedRecordings();
      
      for (const recording of recordings) {
        const emailConfig = recording.emailDelivery;
        
        if (emailConfig.enabled && !recording.emailSent) {
          const shouldSend = this.shouldSendEmail(recording, emailConfig);
          
          if (shouldSend) {
            await this.sendRecordingEmail(recording);
            recording.emailSent = true;
            await this.updateRecordingMetadata(recording);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process email delivery:', error);
    }
  }

  shouldSendEmail(recording, emailConfig) {
    const now = new Date();
    const recordingEnd = new Date(recording.endTime);
    const timeSinceEnd = now - recordingEnd;
    
    switch (emailConfig.schedule) {
      case 'immediate':
        return timeSinceEnd > 60000; // 1 minute after recording ends
      case 'daily':
        return timeSinceEnd > 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return timeSinceEnd > 7 * 24 * 60 * 60 * 1000; // 7 days
      default:
        return false;
    }
  }

  async sendRecordingEmail(recording) {
    try {
      if (!this.emailConfig.enabled) {
        logger.warn('Email delivery not configured');
        return;
      }

      const transporter = nodemailer.createTransporter(this.emailConfig);
      
      // Check file size
      const stats = await fs.stat(recording.filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > this.recordingConfig.maxEmailSize) {
        await this.sendLargeFileNotification(recording, fileSizeMB);
        return;
      }

      const emailContent = await this.prepareEmailContent(recording);
      
      const mailOptions = {
        from: this.emailConfig.from,
        to: recording.emailDelivery.recipients.join(', '),
        subject: `Trading Intercom Recording - ${recording.id}`,
        html: emailContent.html,
        text: emailContent.text,
        attachments: [
          {
            filename: `${recording.id}.wav`,
            path: recording.filePath,
            contentType: 'audio/wav',
          },
          {
            filename: `${recording.id}-metadata.json`,
            path: recording.metadataPath,
            contentType: 'application/json',
          },
        ],
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Email sent for recording ${recording.id} to ${recording.emailDelivery.recipients.length} recipients`);
      
    } catch (error) {
      logger.error(`Failed to send email for recording ${recording.id}:`, error);
    }
  }

  async sendLargeFileNotification(recording, fileSizeMB) {
    try {
      const transporter = nodemailer.createTransporter(this.emailConfig);
      
      const notificationContent = `
        <h2>Trading Intercom Recording - Large File Notification</h2>
        <p><strong>Recording ID:</strong> ${recording.id}</p>
        <p><strong>Group ID:</strong> ${recording.groupId}</p>
        <p><strong>Duration:</strong> ${Math.round(recording.duration / 1000)} seconds</p>
        <p><strong>File Size:</strong> ${fileSizeMB.toFixed(2)} MB</p>
        <p><strong>Participants:</strong> ${Array.from(recording.participants).join(', ')}</p>
        <p><strong>Start Time:</strong> ${recording.startTime}</p>
        <p><strong>End Time:</strong> ${recording.endTime}</p>
        
        <p><em>This recording is too large for email delivery (${fileSizeMB.toFixed(2)} MB > ${this.recordingConfig.maxEmailSize} MB limit). 
        Please access the recording through the admin portal or contact your system administrator.</em></p>
      `;

      const mailOptions = {
        from: this.emailConfig.from,
        to: recording.emailDelivery.recipients.join(', '),
        subject: `Trading Intercom Recording - Large File (${recording.id})`,
        html: notificationContent,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Large file notification sent for recording ${recording.id}`);
      
    } catch (error) {
      logger.error(`Failed to send large file notification for recording ${recording.id}:`, error);
    }
  }

  async prepareEmailContent(recording) {
    const duration = Math.round(recording.duration / 1000);
    const participants = Array.from(recording.participants).join(', ');
    
    const html = `
      <h2>Trading Intercom Recording</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
        <h3>Recording Details</h3>
        <p><strong>Recording ID:</strong> ${recording.id}</p>
        <p><strong>Group ID:</strong> ${recording.groupId}</p>
        <p><strong>Duration:</strong> ${duration} seconds</p>
        <p><strong>Participants:</strong> ${participants}</p>
        <p><strong>Start Time:</strong> ${recording.startTime}</p>
        <p><strong>End Time:</strong> ${recording.endTime}</p>
        <p><strong>Retention Period:</strong> ${recording.retentionPolicy.retentionDays} days</p>
        <p><strong>Encryption:</strong> ${recording.metadata.encryption ? 'Enabled' : 'Disabled'}</p>
      </div>
      
      <div style="margin-top: 20px;">
        <h3>Attachments</h3>
        <ul>
          <li><strong>Audio File:</strong> ${recording.id}.wav</li>
          <li><strong>Metadata:</strong> ${recording.id}-metadata.json</li>
        </ul>
      </div>
      
      <div style="margin-top: 20px; padding: 10px; background-color: #e8f4fd; border-left: 4px solid #2196F3;">
        <p><strong>Compliance Notice:</strong> This recording contains sensitive financial communications and is subject to regulatory retention requirements. 
        Please handle this information in accordance with your organization's data protection policies.</p>
      </div>
    `;

    const text = `
      Trading Intercom Recording
      
      Recording ID: ${recording.id}
      Group ID: ${recording.groupId}
      Duration: ${duration} seconds
      Participants: ${participants}
      Start Time: ${recording.startTime}
      End Time: ${recording.endTime}
      Retention Period: ${recording.retentionPolicy.retentionDays} days
      Encryption: ${recording.metadata.encryption ? 'Enabled' : 'Disabled'}
      
      Attachments:
      - Audio File: ${recording.id}.wav
      - Metadata: ${recording.id}-metadata.json
      
      Compliance Notice: This recording contains sensitive financial communications and is subject to regulatory retention requirements.
    `;

    return { html, text };
  }

  async getRecordingsByGroup(groupId) {
    try {
      const metadataDir = path.join(this.recordingConfig.outputDir, 'metadata');
      const files = await fs.readdir(metadataDir);
      const recordings = [];

      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('-compliance')) {
          const filePath = path.join(metadataDir, file);
          const metadata = JSON.parse(await fs.readFile(filePath, 'utf8'));
          
          if (metadata.groupId === groupId) {
            recordings.push({
              id: metadata.id || file.replace('.json', ''),
              groupId: metadata.groupId,
              startTime: metadata.startTime,
              endTime: metadata.endTime,
              duration: metadata.duration,
              retentionExpiry: metadata.retentionExpiry ? new Date(metadata.retentionExpiry) : null,
              emailSent: metadata.emailSent || false,
              emailDelivery: metadata.emailDelivery,
              retentionPolicy: metadata.retentionPolicy,
              participants: metadata.participants || [],
              filePath: path.join(this.recordingConfig.outputDir, 'raw', `${metadata.id || file.replace('.json', '')}.wav`),
              metadataPath: filePath,
            });
          }
        }
      }

      return recordings;
    } catch (error) {
      logger.error('Failed to get recordings by group:', error);
      return [];
    }
  }

  async getCompletedRecordings() {
    try {
      const metadataDir = path.join(this.recordingConfig.outputDir, 'metadata');
      const files = await fs.readdir(metadataDir);
      const recordings = [];

      for (const file of files) {
        if (file.endsWith('.json') && !file.includes('-compliance')) {
          const filePath = path.join(metadataDir, file);
          const metadata = JSON.parse(await fs.readFile(filePath, 'utf8'));
          
          if (metadata.endTime && !metadata.isActive) {
            recordings.push({
              id: metadata.id || file.replace('.json', ''),
              groupId: metadata.groupId,
              startTime: metadata.startTime,
              endTime: metadata.endTime,
              duration: metadata.duration,
              emailSent: metadata.emailSent || false,
              emailDelivery: metadata.emailDelivery,
              retentionPolicy: metadata.retentionPolicy,
              participants: metadata.participants || [],
              filePath: path.join(this.recordingConfig.outputDir, 'raw', `${metadata.id || file.replace('.json', '')}.wav`),
              metadataPath: filePath,
            });
          }
        }
      }

      return recordings;
    } catch (error) {
      logger.error('Failed to get completed recordings:', error);
      return [];
    }
  }

  async deleteRecording(recordingId) {
    try {
      const rawPath = path.join(this.recordingConfig.outputDir, 'raw', `${recordingId}.wav`);
      const processedPath = path.join(this.recordingConfig.outputDir, 'processed', `${recordingId}.wav`);
      const metadataPath = path.join(this.recordingConfig.outputDir, 'metadata', `${recordingId}.json`);
      const compliancePath = path.join(this.recordingConfig.outputDir, 'metadata', `${recordingId}-compliance.json`);

      const files = [rawPath, processedPath, metadataPath, compliancePath];
      
      for (const filePath of files) {
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      }

      logger.info(`Deleted recording ${recordingId} and all associated files`);
    } catch (error) {
      logger.error(`Failed to delete recording ${recordingId}:`, error);
    }
  }

  async updateRecordingMetadata(recording) {
    try {
      const metadata = {
        ...recording.metadata,
        participants: Array.from(recording.participants),
        duration: recording.duration,
        isActive: recording.isActive,
        emailSent: recording.emailSent,
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(recording.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.error('Failed to update recording metadata:', error);
    }
  }
}

// Initialize the service
const audioRecordingService = new AudioRecordingService();

// Setup periodic cleanup
setInterval(() => {
  audioRecordingService.cleanupOldRecordings();
}, 24 * 60 * 60 * 1000); // Run daily

module.exports = {
  setupAudioRecording: async (mediaSoupWorker) => {
    logger.info('Audio recording service initialized');
    return audioRecordingService;
  },
  audioRecordingService,
};
