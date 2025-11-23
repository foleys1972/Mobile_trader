const { createClient } = require('matrix-js-sdk');
const logger = require('../utils/logger');
const { groupService } = require('./groupService');
const { audioRoutingService } = require('./audioRoutingService');

class MatrixService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.roomMappings = new Map(); // Map groupId to Matrix roomId
    this.userMappings = new Map(); // Map userId to Matrix userId
    this.eventHandlers = new Map(); // Event handlers for different event types
    this.config = {
      baseUrl: process.env.MATRIX_SERVER_URL || 'https://matrix.org',
      accessToken: process.env.MATRIX_ACCESS_TOKEN,
      userId: process.env.MATRIX_USER_ID,
      deviceId: process.env.MATRIX_DEVICE_ID,
      serverName: process.env.MATRIX_SERVER_NAME || 'trading-intercom',
      federationEnabled: process.env.MATRIX_FEDERATION_ENABLED === 'true',
      enabled: process.env.MATRIX_ENABLED === 'true',
    };
  }

  async initialize() {
    if (!this.config.enabled) {
      logger.warn('Matrix integration is disabled');
      return null;
    }

    if (!this.config.accessToken || !this.config.userId) {
      logger.warn('Matrix credentials not provided, running in standalone mode');
      return null;
    }

    try {
      logger.info('Initializing Matrix client...');
      
      this.client = createClient({
        baseUrl: this.config.baseUrl,
        accessToken: this.config.accessToken,
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        useAuthorizationHeader: true,
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Start the client
      await this.client.startClient();
      this.isConnected = true;

      logger.info(`Matrix client connected to ${this.config.baseUrl}`);
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Matrix client:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    if (!this.client) return;

    // Connection status
    this.client.on('sync', (state, prevState, data) => {
      logger.debug(`Matrix sync state: ${state}`);
      if (state === 'SYNCING') {
        this.isConnected = true;
      }
    });

    // Room events
    this.client.on('Room.timeline', (event, room, toStartOfTimeline, removed, data) => {
      if (toStartOfTimeline) return;
      this.handleRoomEvent(event, room);
    });

    // Room member events
    this.client.on('RoomMember.membership', (event, member) => {
      this.handleMembershipEvent(event, member);
    });

    // Call events
    this.client.on('RoomCallState', (event, room) => {
      this.handleCallEvent(event, room);
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('Matrix client error:', error);
      this.isConnected = false;
    });

    this.client.on('httpAuth', (url, data) => {
      logger.warn('Matrix HTTP auth required:', url);
    });

    logger.info('Matrix event handlers configured');
  }

  handleRoomEvent(event, room) {
    const eventType = event.getType();
    const content = event.getContent();
    const sender = event.getSender();
    const roomId = room.roomId;

    logger.debug(`Matrix room event: ${eventType} from ${sender} in ${roomId}`);

    // Handle different event types
    switch (eventType) {
      case 'm.room.message':
        this.handleMessageEvent(event, room, content, sender);
        break;
      case 'm.room.member':
        this.handleMemberEvent(event, room, content, sender);
        break;
      case 'm.room.power_levels':
        this.handlePowerLevelsEvent(event, room, content, sender);
        break;
      case 'm.room.encrypted':
        this.handleEncryptedEvent(event, room);
        break;
      default:
        logger.debug(`Unhandled Matrix event type: ${eventType}`);
    }
  }

  handleMessageEvent(event, room, content, sender) {
    const roomId = room.roomId;
    const groupId = this.getGroupIdFromRoomId(roomId);
    
    if (!groupId) return;

    const message = {
      id: event.getId(),
      content: content.body,
      sender: sender,
      timestamp: event.getTs(),
      type: content.msgtype,
    };

    // Forward message to group service
    groupService.sendBroadcast(groupId, message.content, sender);
    
    logger.info(`Matrix message forwarded to group ${groupId}: ${message.content}`);
  }

  handleMemberEvent(event, room, content, sender) {
    const roomId = room.roomId;
    const groupId = this.getGroupIdFromRoomId(roomId);
    
    if (!groupId) return;

    const membership = content.membership;
    const userId = content.user_id;

    if (membership === 'join') {
      // User joined Matrix room, add to group
      groupService.joinGroup(groupId, userId, { name: userId });
      logger.info(`Matrix user ${userId} joined group ${groupId}`);
    } else if (membership === 'leave') {
      // User left Matrix room, remove from group
      groupService.leaveGroup(groupId, userId);
      logger.info(`Matrix user ${userId} left group ${groupId}`);
    }
  }

  handlePowerLevelsEvent(event, room, content, sender) {
    const roomId = room.roomId;
    const groupId = this.getGroupIdFromRoomId(roomId);
    
    if (!groupId) return;

    // Update group permissions based on Matrix power levels
    const permissions = {
      canSpeak: content.events_default >= 0,
      canMute: content.events_default >= 50,
      canRecord: content.events_default >= 75,
      canModerate: content.events_default >= 100,
      canInvite: content.invite >= 50,
      canKick: content.kick >= 50,
    };

    groupService.setGroupPermissions(groupId, permissions);
    logger.info(`Matrix power levels updated for group ${groupId}`);
  }

  handleEncryptedEvent(event, room) {
    // Handle encrypted events (for future E2E encryption support)
    logger.debug('Encrypted Matrix event received');
  }

  handleCallEvent(event, room) {
    const roomId = room.roomId;
    const groupId = this.getGroupIdFromRoomId(roomId);
    
    if (!groupId) return;

    // Handle Matrix call events (for future voice call integration)
    logger.debug(`Matrix call event in room ${roomId}`);
  }

  handleMembershipEvent(event, member) {
    if (event.getContent().membership === 'invite') {
      this.handleInvitationEvent(event, member);
    }
  }

  handleInvitationEvent(event, member) {
    try {
      const roomId = event.getRoomId();
      const inviter = event.getSender();
      
      logger.info(`Matrix invitation to room ${roomId} from ${inviter}`);
      
      // Auto-accept invitations for intercom rooms
      if (roomId.includes('intercom') || roomId.includes('trading')) {
        this.client.joinRoom(roomId);
        logger.info(`Auto-joined Matrix room: ${roomId}`);
      }
    } catch (error) {
      logger.error('Failed to handle Matrix invitation:', error);
    }
  }

  // Create a Matrix room for a group
  async createGroupRoom(groupId, groupData) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      const roomName = groupData.name || `Group ${groupId}`;
      const roomTopic = groupData.description || `Trading intercom group: ${groupId}`;
      
      const roomOptions = {
        name: roomName,
        topic: roomTopic,
        preset: groupData.isPublic ? 'public_chat' : 'private_chat',
        visibility: groupData.isPublic ? 'public' : 'private',
        room_version: '8', // Use room version 8 for better performance
        power_level_content_override: {
          events_default: 0,
          invite: 50,
          kick: 50,
          ban: 50,
          redact: 50,
          state_default: 50,
          events: {
            'm.room.power_levels': 100,
            'm.room.name': 50,
            'm.room.topic': 50,
            'm.room.avatar': 50,
            'm.room.canonical_alias': 50,
            'm.room.history_visibility': 100,
            'm.room.guest_access': 50,
            'm.room.encryption': 100,
            'm.room.tombstone': 100,
            'm.room.server_acl': 100,
            'm.room.retention': 100,
          },
        },
      };

      const roomId = await this.client.createRoom(roomOptions);
      
      // Set room type for intercom
      await this.client.sendStateEvent(roomId, 'm.room.topic', {
        topic: `Intercom Group: ${roomName}`,
        type: 'intercom-group',
        groupId: groupId,
      });

      // Store room mapping
      this.roomMappings.set(groupId, roomId);

      // Set up room encryption if enabled
      if (groupData.encryption) {
        await this.client.sendStateEvent(roomId, 'm.room.encryption', {
          algorithm: 'm.megolm.v1.aes-sha2',
        });
      }

      logger.info(`Matrix room created for group ${groupId}: ${roomId}`);
      return roomId;
    } catch (error) {
      logger.error('Failed to create Matrix room:', error);
      throw error;
    }
  }

  // Join a Matrix room
  async joinRoom(roomId) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      await this.client.joinRoom(roomId);
      logger.info(`Joined Matrix room: ${roomId}`);
      return true;
    } catch (error) {
      logger.error('Failed to join Matrix room:', error);
      throw error;
    }
  }

  // Leave a Matrix room
  async leaveRoom(roomId) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      await this.client.leave(roomId);
      logger.info(`Left Matrix room: ${roomId}`);
      return true;
    } catch (error) {
      logger.error('Failed to leave Matrix room:', error);
      throw error;
    }
  }

  // Send a message to a Matrix room
  async sendMessage(roomId, message, messageType = 'm.text') {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      const content = {
        body: message,
        msgtype: messageType,
        format: 'org.matrix.custom.html',
        formatted_body: `<p>${message}</p>`,
      };

      await this.client.sendMessage(roomId, content);
      logger.info(`Message sent to Matrix room ${roomId}: ${message}`);
      return true;
    } catch (error) {
      logger.error('Failed to send Matrix message:', error);
      throw error;
    }
  }

  // Send a broadcast message to a group's Matrix room
  async sendGroupBroadcast(groupId, message, senderId) {
    const roomId = this.roomMappings.get(groupId);
    if (!roomId) {
      logger.warn(`No Matrix room found for group ${groupId}`);
      return false;
    }

    return await this.sendMessage(roomId, message);
  }

  // Invite user to Matrix room
  async inviteUser(roomId, userId) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      await this.client.invite(roomId, userId);
      logger.info(`Invited user ${userId} to Matrix room ${roomId}`);
      return true;
    } catch (error) {
      logger.error('Failed to invite user to Matrix room:', error);
      throw error;
    }
  }

  // Kick user from Matrix room
  async kickUser(roomId, userId, reason = '') {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      await this.client.kick(roomId, userId, reason);
      logger.info(`Kicked user ${userId} from Matrix room ${roomId}`);
      return true;
    } catch (error) {
      logger.error('Failed to kick user from Matrix room:', error);
      throw error;
    }
  }

  // Set user power level in Matrix room
  async setUserPowerLevel(roomId, userId, powerLevel) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      const powerLevels = await this.client.getRoomStateEvent(roomId, 'm.room.power_levels', '');
      powerLevels.users = powerLevels.users || {};
      powerLevels.users[userId] = powerLevel;

      await this.client.sendStateEvent(roomId, 'm.room.power_levels', powerLevels);
      logger.info(`Set power level for user ${userId} in room ${roomId}: ${powerLevel}`);
      return true;
    } catch (error) {
      logger.error('Failed to set user power level:', error);
      throw error;
    }
  }

  // Get room information
  async getRoomInfo(roomId) {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      return {
        id: room.roomId,
        name: room.name,
        topic: room.topic,
        memberCount: room.getJoinedMemberCount(),
        isEncrypted: room.hasEncryptionEnabled(),
        powerLevels: room.getPowerLevels(),
      };
    } catch (error) {
      logger.error('Failed to get room info:', error);
      throw error;
    }
  }

  // Get room members
  async getRoomMembers(roomId) {
    try {
      if (!this.client) {
        throw new Error('Matrix client not initialized');
      }

      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      const members = room.getMembers();
      return members.map(member => ({
        userId: member.userId,
        displayName: member.name,
        membership: member.membership,
        powerLevel: member.powerLevel,
      }));
    } catch (error) {
      logger.error(`Failed to get room members for ${roomId}:`, error);
      return [];
    }
  }

  // Get group's Matrix room ID
  getGroupRoomId(groupId) {
    return this.roomMappings.get(groupId);
  }

  // Get group ID from Matrix room ID
  getGroupIdFromRoomId(roomId) {
    for (const [groupId, mappedRoomId] of this.roomMappings) {
      if (mappedRoomId === roomId) {
        return groupId;
      }
    }
    return null;
  }

  // Sync group with Matrix room
  async syncGroupWithMatrix(groupId) {
    const roomId = this.roomMappings.get(groupId);
    if (!roomId) return;

    try {
      const group = groupService.getGroup(groupId);
      if (!group) return;

      const roomInfo = await this.getRoomInfo(roomId);
      
      // Update group with Matrix room info
      await groupService.updateGroup(groupId, {
        matrixRoomId: roomId,
        matrixRoomName: roomInfo.name,
        matrixMemberCount: roomInfo.memberCount,
        matrixIsEncrypted: roomInfo.isEncrypted,
      });

      logger.info(`Synced group ${groupId} with Matrix room ${roomId}`);
    } catch (error) {
      logger.error('Failed to sync group with Matrix:', error);
    }
  }

  // Get Matrix client status
  getStatus() {
    return {
      isInitialized: !!this.client,
      isConnected: this.isConnected,
      userId: this.client?.getUserId(),
      deviceId: this.client?.getDeviceId(),
      roomCount: this.roomMappings.size,
      config: {
        baseUrl: this.config.baseUrl,
        serverName: this.config.serverName,
        federationEnabled: this.config.federationEnabled,
        enabled: this.config.enabled,
      },
    };
  }

  // Get server federation info
  async getServerFederationInfo() {
    try {
      if (!this.client) {
        return { connected: false, serverName: null };
      }

      const serverName = this.config.serverName;
      const connected = this.isConnected;
      
      return {
        connected,
        serverName,
        baseUrl: this.config.baseUrl,
        federationEnabled: this.config.federationEnabled,
      };
    } catch (error) {
      logger.error('Failed to get server federation info:', error);
      return { connected: false, serverName: null };
    }
  }

  // Clean up resources
  async cleanup() {
    if (this.client) {
      await this.client.stopClient();
      this.client = null;
    }
    
    this.isConnected = false;
    this.roomMappings.clear();
    this.userMappings.clear();
    
    logger.info('Matrix service cleaned up');
  }
}

// Initialize the service
const matrixService = new MatrixService();

// Initialize on startup
matrixService.initialize().catch(error => {
  logger.error('Failed to initialize Matrix service:', error);
});

module.exports = {
  matrixService,
  MatrixService,
};