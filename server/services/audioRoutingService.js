const logger = require('../utils/logger');
const { groupService } = require('./groupService');

class AudioRoutingService {
  constructor() {
    this.audioRoutes = new Map(); // Active audio routes
    this.audioMixers = new Map(); // Audio mixers for each group
    this.audioFilters = new Map(); // Audio filters and effects
    this.routingRules = new Map(); // Routing rules and policies
  }

  // Initialize audio routing for a group
  async initializeGroupRouting(groupId) {
    try {
      const group = groupService.getGroup(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Create audio mixer for the group
      const mixer = {
        id: `mixer_${groupId}`,
        groupId,
        participants: new Set(),
        audioStreams: new Map(),
        outputStream: null,
        isActive: false,
        createdAt: new Date(),
      };

      this.audioMixers.set(groupId, mixer);

      // Set up default routing rules
      this.routingRules.set(groupId, {
        maxSimultaneousSpeakers: 3,
        prioritySpeakers: new Set(),
        mutedUsers: new Set(),
        volumeLevels: new Map(),
        audioEffects: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          voiceActivityDetection: true,
        },
      });

      logger.info(`Audio routing initialized for group ${groupId}`);
      return mixer;
    } catch (error) {
      logger.error('Failed to initialize group routing:', error);
      throw error;
    }
  }

  // Add participant to audio routing
  async addParticipant(groupId, userId, audioStream) {
    try {
      const mixer = this.audioMixers.get(groupId);
      if (!mixer) {
        throw new Error('Audio mixer not found for group');
      }

      // Add participant to mixer
      mixer.participants.add(userId);
      mixer.audioStreams.set(userId, {
        stream: audioStream,
        isActive: true,
        volume: 1.0,
        isMuted: false,
        lastActivity: new Date(),
      });

      // Update group audio levels
      groupService.updateAudioLevel(groupId, userId, 0);

      logger.info(`Participant ${userId} added to audio routing for group ${groupId}`);
      return true;
    } catch (error) {
      logger.error('Failed to add participant to audio routing:', error);
      throw error;
    }
  }

  // Remove participant from audio routing
  async removeParticipant(groupId, userId) {
    try {
      const mixer = this.audioMixers.get(groupId);
      if (!mixer) {
        throw new Error('Audio mixer not found for group');
      }

      // Remove participant from mixer
      mixer.participants.delete(userId);
      mixer.audioStreams.delete(userId);

      // Update group audio levels
      groupService.updateAudioLevel(groupId, userId, 0);

      logger.info(`Participant ${userId} removed from audio routing for group ${groupId}`);
      return true;
    } catch (error) {
      logger.error('Failed to remove participant from audio routing:', error);
      throw error;
    }
  }

  // Update participant audio level
  updateParticipantAudioLevel(groupId, userId, level) {
    try {
      const mixer = this.audioMixers.get(groupId);
      if (!mixer) return;

      const participant = mixer.audioStreams.get(userId);
      if (participant) {
        participant.lastActivity = new Date();
        participant.audioLevel = level;
      }

      // Update group audio level
      groupService.updateAudioLevel(groupId, userId, level);

      // Update routing if needed
      this.updateAudioRouting(groupId);
    } catch (error) {
      logger.error('Failed to update participant audio level:', error);
    }
  }

  // Update audio routing based on current state
  updateAudioRouting(groupId) {
    try {
      const mixer = this.audioMixers.get(groupId);
      const rules = this.routingRules.get(groupId);
      if (!mixer || !rules) return;

      // Get active speakers (sorted by audio level)
      const activeSpeakers = Array.from(mixer.audioStreams.entries())
        .filter(([userId, participant]) => 
          participant.isActive && 
          !participant.isMuted && 
          participant.audioLevel > 0.01
        )
        .sort((a, b) => b[1].audioLevel - a[1].audioLevel)
        .slice(0, rules.maxSimultaneousSpeakers);

      // Update routing for each participant
      for (const [userId, participant] of mixer.audioStreams) {
        const shouldRoute = activeSpeakers.some(([speakerId]) => speakerId === userId);
        participant.shouldRoute = shouldRoute;
      }

      logger.debug(`Audio routing updated for group ${groupId}: ${activeSpeakers.length} active speakers`);
    } catch (error) {
      logger.error('Failed to update audio routing:', error);
    }
  }

  // Mute participant
  async muteParticipant(groupId, userId, mutedBy) {
    try {
      const mixer = this.audioMixers.get(groupId);
      if (!mixer) {
        throw new Error('Audio mixer not found for group');
      }

      const participant = mixer.audioStreams.get(userId);
      if (!participant) {
        throw new Error('Participant not found in audio routing');
      }

      // Mute participant
      participant.isMuted = true;
      participant.mutedBy = mutedBy;
      participant.mutedAt = new Date();

      // Update group mute status
      await groupService.muteUser(groupId, userId, mutedBy);

      // Update routing
      this.updateAudioRouting(groupId);

      logger.info(`Participant ${userId} muted in group ${groupId} by ${mutedBy}`);
      return true;
    } catch (error) {
      logger.error('Failed to mute participant:', error);
      throw error;
    }
  }

  // Unmute participant
  async unmuteParticipant(groupId, userId, unmutedBy) {
    try {
      const mixer = this.audioMixers.get(groupId);
      if (!mixer) {
        throw new Error('Audio mixer not found for group');
      }

      const participant = mixer.audioStreams.get(userId);
      if (!participant) {
        throw new Error('Participant not found in audio routing');
      }

      // Unmute participant
      participant.isMuted = false;
      participant.mutedBy = null;
      participant.mutedAt = null;

      // Update group mute status
      await groupService.unmuteUser(groupId, userId, unmutedBy);

      // Update routing
      this.updateAudioRouting(groupId);

      logger.info(`Participant ${userId} unmuted in group ${groupId} by ${unmutedBy}`);
      return true;
    } catch (error) {
      logger.error('Failed to unmute participant:', error);
      throw error;
    }
  }

  // Set participant volume
  setParticipantVolume(groupId, userId, volume) {
    try {
      const mixer = this.audioMixers.get(groupId);
      if (!mixer) return;

      const participant = mixer.audioStreams.get(userId);
      if (participant) {
        participant.volume = Math.max(0, Math.min(1, volume));
      }

      // Update routing rules
      const rules = this.routingRules.get(groupId);
      if (rules) {
        rules.volumeLevels.set(userId, volume);
      }

      logger.debug(`Volume set for participant ${userId} in group ${groupId}: ${volume}`);
    } catch (error) {
      logger.error('Failed to set participant volume:', error);
    }
  }

  // Set priority speaker
  setPrioritySpeaker(groupId, userId, isPriority) {
    try {
      const rules = this.routingRules.get(groupId);
      if (!rules) return;

      if (isPriority) {
        rules.prioritySpeakers.add(userId);
      } else {
        rules.prioritySpeakers.delete(userId);
      }

      // Update routing
      this.updateAudioRouting(groupId);

      logger.info(`Priority speaker ${isPriority ? 'set' : 'removed'} for participant ${userId} in group ${groupId}`);
    } catch (error) {
      logger.error('Failed to set priority speaker:', error);
    }
  }

  // Get audio routing status
  getAudioRoutingStatus(groupId) {
    const mixer = this.audioMixers.get(groupId);
    const rules = this.routingRules.get(groupId);
    
    if (!mixer || !rules) return null;

    return {
      groupId,
      participantCount: mixer.participants.size,
      activeStreams: mixer.audioStreams.size,
      isActive: mixer.isActive,
      maxSimultaneousSpeakers: rules.maxSimultaneousSpeakers,
      prioritySpeakers: Array.from(rules.prioritySpeakers),
      mutedUsers: Array.from(rules.mutedUsers),
      audioEffects: rules.audioEffects,
    };
  }

  // Get participant audio status
  getParticipantAudioStatus(groupId, userId) {
    const mixer = this.audioMixers.get(groupId);
    if (!mixer) return null;

    const participant = mixer.audioStreams.get(userId);
    if (!participant) return null;

    return {
      userId,
      isActive: participant.isActive,
      isMuted: participant.isMuted,
      volume: participant.volume,
      audioLevel: participant.audioLevel || 0,
      lastActivity: participant.lastActivity,
      shouldRoute: participant.shouldRoute || false,
    };
  }

  // Apply audio effects
  applyAudioEffects(groupId, audioStream) {
    try {
      const rules = this.routingRules.get(groupId);
      if (!rules) return audioStream;

      const effects = rules.audioEffects;
      
      // Apply noise suppression
      if (effects.noiseSuppression) {
        // Apply noise suppression filter
        this.applyNoiseSuppression(audioStream);
      }

      // Apply echo cancellation
      if (effects.echoCancellation) {
        // Apply echo cancellation filter
        this.applyEchoCancellation(audioStream);
      }

      // Apply auto gain control
      if (effects.autoGainControl) {
        // Apply auto gain control filter
        this.applyAutoGainControl(audioStream);
      }

      return audioStream;
    } catch (error) {
      logger.error('Failed to apply audio effects:', error);
      return audioStream;
    }
  }

  // Apply noise suppression
  applyNoiseSuppression(audioStream) {
    // This would integrate with WebRTC's built-in noise suppression
    // or apply custom noise suppression algorithms
    logger.debug('Applying noise suppression to audio stream');
  }

  // Apply echo cancellation
  applyEchoCancellation(audioStream) {
    // This would integrate with WebRTC's built-in echo cancellation
    // or apply custom echo cancellation algorithms
    logger.debug('Applying echo cancellation to audio stream');
  }

  // Apply auto gain control
  applyAutoGainControl(audioStream) {
    // This would apply automatic gain control to normalize audio levels
    logger.debug('Applying auto gain control to audio stream');
  }

  // Clean up inactive audio routing
  cleanupInactiveRouting() {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [groupId, mixer] of this.audioMixers) {
      let hasActiveParticipants = false;

      for (const [userId, participant] of mixer.audioStreams) {
        const timeSinceActivity = now - participant.lastActivity;
        
        if (timeSinceActivity > inactiveThreshold) {
          mixer.audioStreams.delete(userId);
          logger.debug(`Cleaned up inactive participant ${userId} from group ${groupId}`);
        } else {
          hasActiveParticipants = true;
        }
      }

      // Remove mixer if no active participants
      if (!hasActiveParticipants) {
        this.audioMixers.delete(groupId);
        this.routingRules.delete(groupId);
        logger.info(`Cleaned up inactive audio routing for group ${groupId}`);
      }
    }
  }

  // Get all audio routing statistics
  getAllAudioRoutingStats() {
    const stats = [];
    
    for (const [groupId, mixer] of this.audioMixers) {
      stats.push({
        groupId,
        participantCount: mixer.participants.size,
        activeStreams: mixer.audioStreams.size,
        isActive: mixer.isActive,
        createdAt: mixer.createdAt,
      });
    }
    
    return stats;
  }
}

// Initialize the service
const audioRoutingService = new AudioRoutingService();

// Cleanup inactive routing every 2 minutes
setInterval(() => {
  audioRoutingService.cleanupInactiveRouting();
}, 2 * 60 * 1000);

module.exports = {
  audioRoutingService,
  AudioRoutingService,
};
