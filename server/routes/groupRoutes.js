const express = require('express');
const router = express.Router();
const { groupService } = require('../services/groupService');
const { audioRoutingService } = require('../services/audioRoutingService');
const { audioRecordingService } = require('../services/audioRecordingService');
const logger = require('../utils/logger');

// Create a new group
router.post('/', async (req, res) => {
  try {
    const { name, description, type, isPublic, maxParticipants, allowRecording, pushToTalk, createdBy } = req.body;
    
    const group = await groupService.createGroup({
      name,
      description,
      type,
      isPublic,
      maxParticipants,
      allowRecording,
      pushToTalk,
      createdBy,
    });

    // Initialize audio routing for the group
    await audioRoutingService.initializeGroupRouting(group.id);

    res.json({
      success: true,
      group,
      message: 'Group created successfully'
    });
  } catch (error) {
    logger.error('Failed to create group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { userId, type, isPublic } = req.query;
    
    let groups;
    if (userId) {
      groups = groupService.getUserGroups(userId);
    } else {
      groups = groupService.getAllGroups();
    }

    // Filter by type if specified
    if (type) {
      groups = groups.filter(group => group.type === type);
    }

    // Filter by public/private if specified
    if (isPublic !== undefined) {
      const isPublicFilter = isPublic === 'true';
      groups = groups.filter(group => group.isPublic === isPublicFilter);
    }

    res.json(groups);
  } catch (error) {
    logger.error('Failed to get groups:', error);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Get group by ID
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = groupService.getGroup(groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get audio routing status
    const audioStatus = audioRoutingService.getAudioRoutingStatus(groupId);
    
    res.json({
      ...group,
      audioStatus,
    });
  } catch (error) {
    logger.error('Failed to get group:', error);
    res.status(500).json({ error: 'Failed to get group' });
  }
});

// Join a group
router.post('/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, userData } = req.body;
    
    const result = await groupService.joinGroup(groupId, userId, userData);
    
    // Add participant to audio routing
    await audioRoutingService.addParticipant(groupId, userId, null); // Audio stream will be added later
    
    res.json({
      success: true,
      ...result,
      message: 'Joined group successfully'
    });
  } catch (error) {
    logger.error('Failed to join group:', error);
    res.status(500).json({ error: error.message || 'Failed to join group' });
  }
});

// Leave a group
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    const result = await groupService.leaveGroup(groupId, userId);
    
    // Remove participant from audio routing
    await audioRoutingService.removeParticipant(groupId, userId);
    
    res.json({
      success: true,
      ...result,
      message: 'Left group successfully'
    });
  } catch (error) {
    logger.error('Failed to leave group:', error);
    res.status(500).json({ error: error.message || 'Failed to leave group' });
  }
});

// Update group settings
router.put('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;
    
    const group = await groupService.updateGroup(groupId, updates);
    
    res.json({
      success: true,
      group,
      message: 'Group updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Mute user in group
router.post('/:groupId/mute', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, mutedBy } = req.body;
    
    await groupService.muteUser(groupId, userId, mutedBy);
    await audioRoutingService.muteParticipant(groupId, userId, mutedBy);
    
    res.json({
      success: true,
      message: 'User muted successfully'
    });
  } catch (error) {
    logger.error('Failed to mute user:', error);
    res.status(500).json({ error: error.message || 'Failed to mute user' });
  }
});

// Unmute user in group
router.post('/:groupId/unmute', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, unmutedBy } = req.body;
    
    await groupService.unmuteUser(groupId, userId, unmutedBy);
    await audioRoutingService.unmuteParticipant(groupId, userId, unmutedBy);
    
    res.json({
      success: true,
      message: 'User unmuted successfully'
    });
  } catch (error) {
    logger.error('Failed to unmute user:', error);
    res.status(500).json({ error: error.message || 'Failed to unmute user' });
  }
});

// Set participant volume
router.post('/:groupId/volume', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, volume } = req.body;
    
    audioRoutingService.setParticipantVolume(groupId, userId, volume);
    
    res.json({
      success: true,
      message: 'Volume set successfully'
    });
  } catch (error) {
    logger.error('Failed to set volume:', error);
    res.status(500).json({ error: 'Failed to set volume' });
  }
});

// Set priority speaker
router.post('/:groupId/priority', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, isPriority } = req.body;
    
    audioRoutingService.setPrioritySpeaker(groupId, userId, isPriority);
    
    res.json({
      success: true,
      message: 'Priority speaker set successfully'
    });
  } catch (error) {
    logger.error('Failed to set priority speaker:', error);
    res.status(500).json({ error: 'Failed to set priority speaker' });
  }
});

// Start group recording
router.post('/:groupId/recording/start', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { startedBy } = req.body;
    
    const recording = await groupService.startGroupRecording(groupId, startedBy);
    
    res.json({
      success: true,
      recording,
      message: 'Recording started successfully'
    });
  } catch (error) {
    logger.error('Failed to start recording:', error);
    res.status(500).json({ error: error.message || 'Failed to start recording' });
  }
});

// Stop group recording
router.post('/:groupId/recording/stop', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { stoppedBy } = req.body;
    
    const result = await groupService.stopGroupRecording(groupId, stoppedBy);
    
    res.json({
      success: true,
      result,
      message: 'Recording stopped successfully'
    });
  } catch (error) {
    logger.error('Failed to stop recording:', error);
    res.status(500).json({ error: error.message || 'Failed to stop recording' });
  }
});

// Send broadcast message
router.post('/:groupId/broadcast', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message, senderId } = req.body;
    
    const broadcast = await groupService.sendBroadcast(groupId, message, senderId);
    
    res.json({
      success: true,
      broadcast,
      message: 'Broadcast sent successfully'
    });
  } catch (error) {
    logger.error('Failed to send broadcast:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// Get group broadcasts
router.get('/:groupId/broadcasts', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50 } = req.query;
    
    const broadcasts = groupService.getGroupBroadcasts(groupId, parseInt(limit));
    
    res.json(broadcasts);
  } catch (error) {
    logger.error('Failed to get broadcasts:', error);
    res.status(500).json({ error: 'Failed to get broadcasts' });
  }
});

// Get group statistics
router.get('/:groupId/stats', async (req, res) => {
  try {
    const { groupId } = req.params;
    const stats = groupService.getGroupStats(groupId);
    
    if (!stats) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get group stats:', error);
    res.status(500).json({ error: 'Failed to get group stats' });
  }
});

// Get all group statistics
router.get('/stats/all', async (req, res) => {
  try {
    const stats = groupService.getAllGroupStats();
    const audioStats = audioRoutingService.getAllAudioRoutingStats();
    
    res.json({
      groups: stats,
      audioRouting: audioStats,
    });
  } catch (error) {
    logger.error('Failed to get all group stats:', error);
    res.status(500).json({ error: 'Failed to get group stats' });
  }
});

// Get participant audio status
router.get('/:groupId/participant/:userId/audio', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const status = audioRoutingService.getParticipantAudioStatus(groupId, userId);
    
    if (!status) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    res.json(status);
  } catch (error) {
    logger.error('Failed to get participant audio status:', error);
    res.status(500).json({ error: 'Failed to get participant audio status' });
  }
});

// Update participant audio level
router.post('/:groupId/participant/:userId/audio-level', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { level } = req.body;
    
    audioRoutingService.updateParticipantAudioLevel(groupId, userId, level);
    
    res.json({
      success: true,
      message: 'Audio level updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update audio level:', error);
    res.status(500).json({ error: 'Failed to update audio level' });
  }
});

// Check group permissions
router.get('/:groupId/permissions/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { permission } = req.query;
    
    if (permission) {
      const hasPermission = groupService.hasPermission(groupId, userId, permission);
      res.json({ hasPermission });
    } else {
      const permissions = groupService.getGroupPermissions(groupId);
      res.json(permissions);
    }
  } catch (error) {
    logger.error('Failed to check permissions:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
});

// Set group permissions
router.put('/:groupId/permissions', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { permissions } = req.body;
    
    groupService.setGroupPermissions(groupId, permissions);
    
    res.json({
      success: true,
      message: 'Permissions updated successfully'
    });
  } catch (error) {
    logger.error('Failed to set permissions:', error);
    res.status(500).json({ error: 'Failed to set permissions' });
  }
});

module.exports = router;
