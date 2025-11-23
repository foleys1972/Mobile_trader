const logger = require('../utils/logger');
const { getGroupById, createGroup, addUserToGroup, removeUserFromGroup, updateUser } = require('./databaseService');

class GroupService {
  constructor() {
    this.activeGroups = new Map(); // In-memory group state
    this.groupRooms = new Map(); // MediaSoup rooms for each group
    this.userGroups = new Map(); // User to groups mapping
    this.groupPermissions = new Map(); // Group-specific permissions
  }

  // Create a new group
  async createGroup(groupData) {
    try {
      const group = await createGroup({
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: groupData.name,
        description: groupData.description,
        type: groupData.type || 'trading',
        isPublic: groupData.isPublic || false,
        maxParticipants: groupData.maxParticipants || 200,
        allowRecording: groupData.allowRecording !== false,
        pushToTalk: groupData.pushToTalk || false,
        createdBy: groupData.createdBy,
        participants: [groupData.createdBy],
        matrixRoomId: groupData.matrixRoomId,
        sipEnabled: groupData.sipEnabled || false,
        sipNumbers: groupData.sipNumbers || [],
        retentionPolicy: {
          retentionDays: groupData.retentionDays || 2555,
          emailDelivery: groupData.emailDelivery || false,
          emailRecipients: groupData.emailRecipients || [],
          emailSchedule: groupData.emailSchedule || 'immediate'
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Initialize in-memory group state
      this.activeGroups.set(group.id, {
        ...group,
        participants: new Set([groupData.createdBy]),
        isActive: true,
        currentSpeaker: null,
        audioLevels: new Map(),
        recording: null,
        broadcastQueue: [],
        lastActivity: new Date(),
      });

      // Set up group permissions
      this.setGroupPermissions(group.id, {
        canSpeak: true,
        canMute: true,
        canRecord: groupData.createdBy === groupData.createdBy,
        canModerate: groupData.createdBy === groupData.createdBy,
        canInvite: true,
        canKick: groupData.createdBy === groupData.createdBy,
      });

      logger.info(`Group created: ${group.name} (${group.id})`);
      return group;
    } catch (error) {
      logger.error('Failed to create group:', error);
      throw error;
    }
  }

  // Join a group
  async joinGroup(groupId, userId, userData) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if group is full
      if (group.participants.size >= group.maxParticipants) {
        throw new Error('Group is full');
      }

      // Add user to group
      group.participants.add(userId);
      group.lastActivity = new Date();
      
      // Update user groups mapping
      if (!this.userGroups.has(userId)) {
        this.userGroups.set(userId, new Set());
      }
      this.userGroups.get(userId).add(groupId);

      // Add user to database
      await addUserToGroup(groupId, userId);

      // Initialize user audio level
      group.audioLevels.set(userId, 0);

      logger.info(`User ${userId} joined group ${groupId}`);
      return {
        groupId,
        userId,
        participants: Array.from(group.participants),
        groupInfo: {
          name: group.name,
          type: group.type,
          maxParticipants: group.maxParticipants,
          allowRecording: group.allowRecording,
          pushToTalk: group.pushToTalk,
        }
      };
    } catch (error) {
      logger.error('Failed to join group:', error);
      throw error;
    }
  }

  // Leave a group
  async leaveGroup(groupId, userId) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Remove user from group
      group.participants.delete(userId);
      group.audioLevels.delete(userId);
      group.lastActivity = new Date();

      // Update user groups mapping
      if (this.userGroups.has(userId)) {
        this.userGroups.get(userId).delete(groupId);
        if (this.userGroups.get(userId).size === 0) {
          this.userGroups.delete(userId);
        }
      }

      // Remove user from database
      await removeUserFromGroup(groupId, userId);

      // Clean up empty groups
      if (group.participants.size === 0) {
        this.activeGroups.delete(groupId);
        this.groupPermissions.delete(groupId);
        logger.info(`Group ${groupId} deleted (no participants)`);
      }

      logger.info(`User ${userId} left group ${groupId}`);
      return {
        groupId,
        userId,
        participants: Array.from(group.participants),
      };
    } catch (error) {
      logger.error('Failed to leave group:', error);
      throw error;
    }
  }

  // Get group information
  getGroup(groupId) {
    return this.activeGroups.get(groupId);
  }

  // Get user's groups
  getUserGroups(userId) {
    const groupIds = this.userGroups.get(userId) || new Set();
    return Array.from(groupIds).map(groupId => this.activeGroups.get(groupId)).filter(Boolean);
  }

  // Get all active groups
  getAllGroups() {
    return Array.from(this.activeGroups.values());
  }

  // Update group settings
  async updateGroup(groupId, updates) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Update group data
      Object.assign(group, updates);
      group.updatedAt = new Date();

      // Update database
      await updateUser(groupId, updates);

      logger.info(`Group ${groupId} updated`);
      return group;
    } catch (error) {
      logger.error('Failed to update group:', error);
      throw error;
    }
  }

  // Set group permissions
  setGroupPermissions(groupId, permissions) {
    this.groupPermissions.set(groupId, {
      canSpeak: permissions.canSpeak !== false,
      canMute: permissions.canMute !== false,
      canRecord: permissions.canRecord || false,
      canModerate: permissions.canModerate || false,
      canInvite: permissions.canInvite !== false,
      canKick: permissions.canKick || false,
    });
  }

  // Get group permissions
  getGroupPermissions(groupId) {
    return this.groupPermissions.get(groupId) || {
      canSpeak: true,
      canMute: true,
      canRecord: false,
      canModerate: false,
      canInvite: true,
      canKick: false,
    };
  }

  // Check if user has permission in group
  hasPermission(groupId, userId, permission) {
    const group = this.activeGroups.get(groupId);
    if (!group) return false;

    const permissions = this.getGroupPermissions(groupId);
    
    // Creator has all permissions
    if (group.createdBy === userId) {
      return true;
    }

    return permissions[permission] || false;
  }

  // Update user audio level
  updateAudioLevel(groupId, userId, level) {
    const group = this.activeGroups.get(groupId);
    if (!group) return;

    group.audioLevels.set(userId, level);
    group.lastActivity = new Date();

    // Update current speaker
    if (level > 0.01) {
      group.currentSpeaker = userId;
    } else if (group.currentSpeaker === userId) {
      group.currentSpeaker = null;
    }
  }

  // Get current speaker
  getCurrentSpeaker(groupId) {
    const group = this.activeGroups.get(groupId);
    return group?.currentSpeaker || null;
  }

  // Get group audio levels
  getGroupAudioLevels(groupId) {
    const group = this.activeGroups.get(groupId);
    if (!group) return {};

    const levels = {};
    for (const [userId, level] of group.audioLevels) {
      levels[userId] = level;
    }
    return levels;
  }

  // Mute user in group
  async muteUser(groupId, userId, mutedBy) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check permissions
      if (!this.hasPermission(groupId, mutedBy, 'canMute')) {
        throw new Error('No permission to mute users');
      }

      // Update user mute status
      group.mutedUsers = group.mutedUsers || new Set();
      group.mutedUsers.add(userId);

      logger.info(`User ${userId} muted in group ${groupId} by ${mutedBy}`);
      return true;
    } catch (error) {
      logger.error('Failed to mute user:', error);
      throw error;
    }
  }

  // Unmute user in group
  async unmuteUser(groupId, userId, unmutedBy) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check permissions
      if (!this.hasPermission(groupId, unmutedBy, 'canMute')) {
        throw new Error('No permission to unmute users');
      }

      // Update user mute status
      group.mutedUsers = group.mutedUsers || new Set();
      group.mutedUsers.delete(userId);

      logger.info(`User ${userId} unmuted in group ${groupId} by ${unmutedBy}`);
      return true;
    } catch (error) {
      logger.error('Failed to unmute user:', error);
      throw error;
    }
  }

  // Check if user is muted
  isUserMuted(groupId, userId) {
    const group = this.activeGroups.get(groupId);
    if (!group) return false;

    return group.mutedUsers?.has(userId) || false;
  }

  // Start group recording
  async startGroupRecording(groupId, startedBy) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check permissions
      if (!this.hasPermission(groupId, startedBy, 'canRecord')) {
        throw new Error('No permission to start recording');
      }

      // Check if recording is allowed
      if (!group.allowRecording) {
        throw new Error('Recording not allowed in this group');
      }

      // Start recording
      const recording = await this.audioRecordingService.startRecording(
        `session_${groupId}_${Date.now()}`,
        groupId,
        startedBy,
        {
          groupName: group.name,
          groupType: group.type,
          participants: Array.from(group.participants),
          startedBy,
        }
      );

      group.recording = {
        id: recording.recordingId,
        isActive: true,
        startTime: recording.startTime,
        startedBy,
      };

      logger.info(`Recording started in group ${groupId} by ${startedBy}`);
      return recording;
    } catch (error) {
      logger.error('Failed to start group recording:', error);
      throw error;
    }
  }

  // Stop group recording
  async stopGroupRecording(groupId, stoppedBy) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group || !group.recording) {
        throw new Error('No active recording found');
      }

      // Check permissions
      if (!this.hasPermission(groupId, stoppedBy, 'canRecord')) {
        throw new Error('No permission to stop recording');
      }

      // Stop recording
      const result = await this.audioRecordingService.stopRecording(
        group.recording.id,
        'manual-stop'
      );

      group.recording.isActive = false;

      logger.info(`Recording stopped in group ${groupId} by ${stoppedBy}`);
      return result;
    } catch (error) {
      logger.error('Failed to stop group recording:', error);
      throw error;
    }
  }

  // Send broadcast message to group
  async sendBroadcast(groupId, message, senderId) {
    try {
      const group = this.activeGroups.get(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const broadcast = {
        id: `broadcast_${Date.now()}`,
        message,
        senderId,
        timestamp: new Date(),
        groupId,
      };

      // Add to broadcast queue
      group.broadcastQueue.push(broadcast);

      // Keep only last 100 broadcasts
      if (group.broadcastQueue.length > 100) {
        group.broadcastQueue.shift();
      }

      logger.info(`Broadcast sent to group ${groupId} by ${senderId}`);
      return broadcast;
    } catch (error) {
      logger.error('Failed to send broadcast:', error);
      throw error;
    }
  }

  // Get group broadcasts
  getGroupBroadcasts(groupId, limit = 50) {
    const group = this.activeGroups.get(groupId);
    if (!group) return [];

    return group.broadcastQueue.slice(-limit);
  }

  // Get group statistics
  getGroupStats(groupId) {
    const group = this.activeGroups.get(groupId);
    if (!group) return null;

    return {
      id: group.id,
      name: group.name,
      participantCount: group.participants.size,
      isActive: group.isActive,
      hasRecording: !!group.recording,
      currentSpeaker: group.currentSpeaker,
      lastActivity: group.lastActivity,
      broadcastCount: group.broadcastQueue.length,
      audioLevels: Object.fromEntries(group.audioLevels),
    };
  }

  // Get all group statistics
  getAllGroupStats() {
    const stats = [];
    for (const [groupId, group] of this.activeGroups) {
      stats.push(this.getGroupStats(groupId));
    }
    return stats;
  }

  // Clean up inactive groups
  cleanupInactiveGroups() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [groupId, group] of this.activeGroups) {
      const timeSinceActivity = now - group.lastActivity;
      
      if (timeSinceActivity > inactiveThreshold && group.participants.size === 0) {
        this.activeGroups.delete(groupId);
        this.groupPermissions.delete(groupId);
        logger.info(`Cleaned up inactive group: ${groupId}`);
      }
    }
  }

  // Initialize audio recording service
  setAudioRecordingService(audioRecordingService) {
    this.audioRecordingService = audioRecordingService;
  }
}

// Initialize the service
const groupService = new GroupService();

// Cleanup inactive groups every 5 minutes
setInterval(() => {
  groupService.cleanupInactiveGroups();
}, 5 * 60 * 1000);

module.exports = {
  groupService,
  GroupService,
};
