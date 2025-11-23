const logger = require('./utils/logger');
const { audioRecordingService } = require('./services/audioRecordingService');

class SocketHandler {
  constructor(io, services) {
    this.io = io;
    this.mediaSoupWorker = services.mediaSoupWorker;
    this.matrixClient = services.matrixClient;
    this.sipGateway = services.sipGateway;
    this.redisClient = services.redisClient;
    this.activeRooms = new Map();
    this.userSessions = new Map();
  }

  setupHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Authentication
      socket.on('authenticate', (data) => this.handleAuthentication(socket, data));
      
      // Room management
      socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave-room', (data) => this.handleLeaveRoom(socket, data));
      
      // WebRTC signaling
      socket.on('webrtc-offer', (data) => this.handleWebRTCOffer(socket, data));
      socket.on('webrtc-answer', (data) => this.handleWebRTCAnswer(socket, data));
      socket.on('webrtc-ice-candidate', (data) => this.handleWebRTCIceCandidate(socket, data));
      
      // Audio control
      socket.on('start-speaking', (data) => this.handleStartSpeaking(socket, data));
      socket.on('stop-speaking', (data) => this.handleStopSpeaking(socket, data));
      socket.on('mute-toggle', (data) => this.handleMuteToggle(socket, data));
      
      // Recording control
      socket.on('start-recording', (data) => this.handleStartRecording(socket, data));
      socket.on('stop-recording', (data) => this.handleStopRecording(socket, data));
      
      // Group management
      socket.on('create-group', (data) => this.handleCreateGroup(socket, data));
      socket.on('join-group', (data) => this.handleJoinGroup(socket, data));
      socket.on('leave-group', (data) => this.handleLeaveGroup(socket, data));
      
      // Broadcast
      socket.on('broadcast-message', (data) => this.handleBroadcastMessage(socket, data));
      
      // Disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  async handleAuthentication(socket, data) {
    try {
      const { userId, token, groupId } = data;
      
      // Validate user authentication
      const user = await this.validateUser(userId, token);
      if (!user) {
        socket.emit('auth-error', { message: 'Invalid credentials' });
        return;
      }

      // Store user session
      this.userSessions.set(socket.id, {
        userId,
        user,
        groupId,
        connectedAt: new Date(),
        isAuthenticated: true,
      });

      socket.emit('auth-success', { userId, user });
      logger.info(`User ${userId} authenticated successfully`);
    } catch (error) {
      logger.error('Authentication failed:', error);
      socket.emit('auth-error', { message: 'Authentication failed' });
    }
  }

  async handleJoinRoom(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session || !session.isAuthenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { roomId, groupId } = data;
      
      // Create or get room
      let room = this.activeRooms.get(roomId);
      if (!room) {
        room = await this.createRoom(roomId, groupId);
        this.activeRooms.set(roomId, room);
      }

      // Add user to room
      room.participants.set(socket.id, {
        socket,
        userId: session.userId,
        user: session.user,
        joinedAt: new Date(),
        isSpeaking: false,
        isMuted: false,
      });

      // Join socket room for broadcasting
      socket.join(roomId);
      
      // Update session
      session.roomId = roomId;
      session.groupId = groupId;

      // Notify other participants
      socket.to(roomId).emit('user-joined', {
        userId: session.userId,
        user: session.user,
        timestamp: new Date(),
      });

      // Send current participants to new user
      const participants = Array.from(room.participants.values()).map(p => ({
        userId: p.userId,
        user: p.user,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted,
      }));

      socket.emit('room-joined', {
        roomId,
        participants,
        roomConfig: room.config,
      });

      logger.info(`User ${session.userId} joined room ${roomId}`);
    } catch (error) {
      logger.error('Failed to join room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  async handleLeaveRoom(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      const { roomId } = data;
      const room = this.activeRooms.get(roomId);
      
      if (room && room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        
        // Stop any active recording for this user
        if (room.recording && room.recording.isActive) {
          await audioRecordingService.removeParticipantFromRecording(
            room.recording.id, 
            session.userId
          );
        }

        // Remove from room
        room.participants.delete(socket.id);
        socket.leave(roomId);

        // Notify other participants
        socket.to(roomId).emit('user-left', {
          userId: session.userId,
          timestamp: new Date(),
        });

        // Clean up empty rooms
        if (room.participants.size === 0) {
          if (room.recording && room.recording.isActive) {
            await audioRecordingService.stopRecording(room.recording.id, 'room-closed');
          }
          this.activeRooms.delete(roomId);
        }

        logger.info(`User ${session.userId} left room ${roomId}`);
      }
    } catch (error) {
      logger.error('Failed to leave room:', error);
    }
  }

  async handleStartSpeaking(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      const { roomId } = data;
      const room = this.activeRooms.get(roomId);
      
      if (room && room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        participant.isSpeaking = true;

        // Notify other participants
        socket.to(roomId).emit('user-speaking', {
          userId: session.userId,
          timestamp: new Date(),
        });

        logger.debug(`User ${session.userId} started speaking in room ${roomId}`);
      }
    } catch (error) {
      logger.error('Failed to handle start speaking:', error);
    }
  }

  async handleStopSpeaking(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      const { roomId } = data;
      const room = this.activeRooms.get(roomId);
      
      if (room && room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        participant.isSpeaking = false;

        // Notify other participants
        socket.to(roomId).emit('user-stopped-speaking', {
          userId: session.userId,
          timestamp: new Date(),
        });

        logger.debug(`User ${session.userId} stopped speaking in room ${roomId}`);
      }
    } catch (error) {
      logger.error('Failed to handle stop speaking:', error);
    }
  }

  async handleMuteToggle(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      const { roomId, muted } = data;
      const room = this.activeRooms.get(roomId);
      
      if (room && room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        participant.isMuted = muted;

        // Notify other participants
        socket.to(roomId).emit('user-mute-changed', {
          userId: session.userId,
          muted,
          timestamp: new Date(),
        });

        logger.info(`User ${session.userId} ${muted ? 'muted' : 'unmuted'} in room ${roomId}`);
      }
    } catch (error) {
      logger.error('Failed to handle mute toggle:', error);
    }
  }

  async handleStartRecording(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session || !session.isAuthenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { roomId, groupId } = data;
      const room = this.activeRooms.get(roomId);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if user has recording permissions
      if (!this.hasRecordingPermission(session.user, room)) {
        socket.emit('error', { message: 'No recording permission' });
        return;
      }

      // Start recording if not already active
      if (!room.recording || !room.recording.isActive) {
        const recording = await audioRecordingService.startRecording(
          roomId,
          groupId,
          session.userId,
          {
            roomId,
            groupId,
            participants: Array.from(room.participants.keys()),
            startedBy: session.userId,
          }
        );

        room.recording = {
          id: recording.recordingId,
          isActive: true,
          startTime: recording.startTime,
        };

        // Add all current participants to recording
        for (const [socketId, participant] of room.participants) {
          await audioRecordingService.addParticipantToRecording(
            recording.recordingId,
            participant.userId
          );
        }

        // Notify all participants
        this.io.to(roomId).emit('recording-started', {
          recordingId: recording.recordingId,
          startedBy: session.userId,
          timestamp: new Date(),
        });

        logger.info(`Recording started in room ${roomId} by user ${session.userId}`);
      }

      socket.emit('recording-status', {
        isRecording: true,
        recordingId: room.recording.id,
      });
    } catch (error) {
      logger.error('Failed to start recording:', error);
      socket.emit('error', { message: 'Failed to start recording' });
    }
  }

  async handleStopRecording(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      const { roomId } = data;
      const room = this.activeRooms.get(roomId);
      
      if (room && room.recording && room.recording.isActive) {
        // Check if user has permission to stop recording
        if (!this.hasRecordingPermission(session.user, room)) {
          socket.emit('error', { message: 'No permission to stop recording' });
          return;
        }

        const result = await audioRecordingService.stopRecording(
          room.recording.id,
          'manual-stop'
        );

        room.recording.isActive = false;

        // Notify all participants
        this.io.to(roomId).emit('recording-stopped', {
          recordingId: room.recording.id,
          duration: result.duration,
          stoppedBy: session.userId,
          timestamp: new Date(),
        });

        logger.info(`Recording stopped in room ${roomId} by user ${session.userId}`);
      }

      socket.emit('recording-status', { isRecording: false });
    } catch (error) {
      logger.error('Failed to stop recording:', error);
      socket.emit('error', { message: 'Failed to stop recording' });
    }
  }

  async handleCreateGroup(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session || !session.isAuthenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const { groupName, groupType, isPublic } = data;
      
      // Create Matrix room if Matrix is enabled
      let matrixRoomId = null;
      if (this.matrixClient) {
        matrixRoomId = await this.matrixClient.createIntercomRoom(
          `group_${Date.now()}`,
          groupName,
          isPublic
        );
      }

      const group = {
        id: `group_${Date.now()}`,
        name: groupName,
        type: groupType,
        isPublic,
        createdBy: session.userId,
        createdAt: new Date(),
        matrixRoomId,
        participants: new Set([session.userId]),
      };

      // Store group in Redis
      if (this.redisClient) {
        await this.redisClient.hset('groups', group.id, JSON.stringify(group));
      }

      socket.emit('group-created', group);
      logger.info(`Group ${groupName} created by user ${session.userId}`);
    } catch (error) {
      logger.error('Failed to create group:', error);
      socket.emit('error', { message: 'Failed to create group' });
    }
  }

  async handleBroadcastMessage(socket, data) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      const { message, targetGroups, priority } = data;
      
      const broadcast = {
        id: `broadcast_${Date.now()}`,
        message,
        sender: session.userId,
        targetGroups,
        priority: priority || 'normal',
        timestamp: new Date(),
      };

      // Send to target groups
      for (const groupId of targetGroups) {
        const room = this.activeRooms.get(groupId);
        if (room) {
          this.io.to(groupId).emit('broadcast-message', broadcast);
        }
      }

      // Send to Matrix if enabled
      if (this.matrixClient && targetGroups.length > 0) {
        for (const groupId of targetGroups) {
          const group = await this.getGroup(groupId);
          if (group && group.matrixRoomId) {
            await this.matrixClient.sendIntercomMessage(
              group.matrixRoomId,
              `BROADCAST: ${message}`
            );
          }
        }
      }

      logger.info(`Broadcast sent by user ${session.userId} to ${targetGroups.length} groups`);
    } catch (error) {
      logger.error('Failed to handle broadcast message:', error);
      socket.emit('error', { message: 'Failed to send broadcast' });
    }
  }

  async handleDisconnect(socket) {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) return;

      // Leave all rooms
      for (const [roomId, room] of this.activeRooms) {
        if (room.participants.has(socket.id)) {
          const participant = room.participants.get(socket.id);
          
          // Remove from room
          room.participants.delete(socket.id);
          socket.leave(roomId);

          // Notify other participants
          socket.to(roomId).emit('user-left', {
            userId: session.userId,
            timestamp: new Date(),
          });

          // Clean up empty rooms
          if (room.participants.size === 0) {
            if (room.recording && room.recording.isActive) {
              await audioRecordingService.stopRecording(room.recording.id, 'room-closed');
            }
            this.activeRooms.delete(roomId);
          }
        }
      }

      // Remove user session
      this.userSessions.delete(socket.id);
      
      logger.info(`User ${session.userId} disconnected`);
    } catch (error) {
      logger.error('Failed to handle disconnect:', error);
    }
  }

  // Helper methods
  async validateUser(userId, token) {
    // Implement user validation logic
    // This would typically check against AD or local database
    return {
      id: userId,
      name: `User ${userId}`,
      permissions: ['speak', 'record'],
    };
  }

  async createRoom(roomId, groupId) {
    return {
      id: roomId,
      groupId,
      participants: new Map(),
      recording: null,
      config: {
        maxParticipants: 200,
        allowRecording: true,
        pushToTalk: false,
      },
      createdAt: new Date(),
    };
  }

  hasRecordingPermission(user, room) {
    // Implement recording permission logic
    return user.permissions && user.permissions.includes('record');
  }

  async getGroup(groupId) {
    if (this.redisClient) {
      const groupData = await this.redisClient.hget('groups', groupId);
      return groupData ? JSON.parse(groupData) : null;
    }
    return null;
  }
}

function setupSocketHandlers(io, services) {
  const handler = new SocketHandler(io, services);
  handler.setupHandlers();
  return handler;
}

module.exports = { setupSocketHandlers };
