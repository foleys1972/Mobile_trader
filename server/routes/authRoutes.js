const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { activeDirectoryService } = require('../services/activeDirectoryService');
const { groupService } = require('../services/groupService');
const logger = require('../utils/logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Local user storage (in production, use a database)
const localUsers = new Map();
const userSessions = new Map();

// Initialize with some default users
localUsers.set('admin', {
  id: 'admin-001',
  username: 'admin',
  email: 'admin@trading-intercom.com',
  firstName: 'Admin',
  lastName: 'User',
  displayName: 'Administrator',
  password: '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', // 'admin123'
  role: 'admin',
  isActive: true,
  source: 'local',
  createdAt: new Date(),
  lastLogin: null
});

localUsers.set('trader', {
  id: 'trader-001',
  username: 'trader',
  email: 'trader@trading-intercom.com',
  firstName: 'Trader',
  lastName: 'User',
  displayName: 'Trader',
  password: '$2b$10$rQZ8K9vX8K9vX8K9vX8K9e', // 'password'
  role: 'trader',
  isActive: true,
  source: 'local',
  createdAt: new Date(),
  lastLogin: null
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      source: user.source
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to authenticate requests
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
};

// Login with username/password
router.post('/login', async (req, res) => {
  try {
    const { username, password, useAD = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    let user = null;
    let authResult = null;

    if (useAD && activeDirectoryService.getStatus().isConnected) {
      // Try Active Directory authentication
      try {
        authResult = await activeDirectoryService.authenticateUser(username, password);
        if (authResult.authenticated) {
          const userDetails = await activeDirectoryService.getUserDetails(username);
          user = {
            id: userDetails.guid,
            username: userDetails.username,
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
            displayName: userDetails.displayName,
            title: userDetails.title,
            department: userDetails.department,
            phone: userDetails.phone,
            role: 'user', // Default role, can be enhanced with AD group mapping
            source: 'active_directory',
            isActive: true
          };
        }
      } catch (error) {
        logger.warn(`AD authentication failed for ${username}:`, error.message);
      }
    }

    if (!user) {
      // Try local authentication
      const localUser = localUsers.get(username);
      if (!localUser) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // In a real implementation, you would verify the password hash
      // For demo purposes, we'll accept 'password' for local users
      if (password !== 'password' && password !== 'admin123') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = {
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        displayName: localUser.displayName,
        role: localUser.role,
        source: 'local',
        isActive: localUser.isActive
      };
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Store session
    userSessions.set(user.id, {
      user,
      token,
      loginTime: new Date(),
      lastActivity: new Date()
    });

    // Update last login
    if (user.source === 'local') {
      const localUser = localUsers.get(user.username);
      if (localUser) {
        localUser.lastLogin = new Date();
      }
    }

    logger.info(`User ${username} logged in successfully (source: ${user.source})`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        source: user.source
      },
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Remove session
    userSessions.delete(userId);
    
    logger.info(`User ${req.user.username} logged out`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  try {
    const session = userSessions.get(req.user.id);
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    // Update last activity
    session.lastActivity = new Date();

    res.json({
      success: true,
      user: session.user
    });
  } catch (error) {
    logger.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const session = userSessions.get(req.user.id);
    if (!session) {
      return res.status(401).json({ error: 'Session not found' });
    }

    // Generate new token
    const newToken = generateToken(session.user);
    
    // Update session
    session.token = newToken;
    session.lastActivity = new Date();

    res.json({
      success: true,
      token: newToken,
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Search users (AD integration)
router.get('/users/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let users = [];

    // Search in AD if connected
    if (activeDirectoryService.getStatus().isConnected) {
      try {
        const adUsers = await activeDirectoryService.searchUsers(q, parseInt(limit));
        users = adUsers.map(user => ({
          id: user.guid,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          title: user.title,
          department: user.department,
          source: 'active_directory'
        }));
      } catch (error) {
        logger.error('AD user search failed:', error);
      }
    }

    // Also search local users
    const localUsersList = Array.from(localUsers.values())
      .filter(user => 
        user.username.toLowerCase().includes(q.toLowerCase()) ||
        user.email.toLowerCase().includes(q.toLowerCase()) ||
        user.displayName.toLowerCase().includes(q.toLowerCase())
      )
      .map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        source: 'local'
      }));

    users = [...users, ...localUsersList];

    res.json({
      success: true,
      users: users.slice(0, parseInt(limit)),
      total: users.length
    });
  } catch (error) {
    logger.error('User search error:', error);
    res.status(500).json({ error: 'User search failed' });
  }
});

// Get user groups (AD integration)
router.get('/users/:username/groups', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    let groups = [];

    // Get groups from AD if connected
    if (activeDirectoryService.getStatus().isConnected) {
      try {
        const adGroups = await activeDirectoryService.getUserGroups(username);
        groups = adGroups.map(group => ({
          id: group.guid,
          name: group.name,
          description: group.description,
          source: 'active_directory'
        }));
      } catch (error) {
        logger.error('AD group lookup failed:', error);
      }
    }

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    logger.error('Get user groups error:', error);
    res.status(500).json({ error: 'Failed to get user groups' });
  }
});

// Get AD status
router.get('/ad/status', authenticateToken, (req, res) => {
  try {
    const status = activeDirectoryService.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Get AD status error:', error);
    res.status(500).json({ error: 'Failed to get AD status' });
  }
});

// Sync users from AD
router.post('/ad/sync/users', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const users = await activeDirectoryService.syncUsers();
    
    res.json({
      success: true,
      message: `Synced ${users.length} users from Active Directory`,
      users: users.slice(0, 100) // Return first 100 users
    });
  } catch (error) {
    logger.error('AD user sync error:', error);
    res.status(500).json({ error: 'Failed to sync users from AD' });
  }
});

// Sync groups from AD
router.post('/ad/sync/groups', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const groups = await activeDirectoryService.syncGroups();
    
    res.json({
      success: true,
      message: `Synced ${groups.length} groups from Active Directory`,
      groups: groups.slice(0, 100) // Return first 100 groups
    });
  } catch (error) {
    logger.error('AD group sync error:', error);
    res.status(500).json({ error: 'Failed to sync groups from AD' });
  }
});

// Get cached users
router.get('/ad/users', authenticateToken, (req, res) => {
  try {
    const users = activeDirectoryService.getAllCachedUsers();
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    logger.error('Get cached users error:', error);
    res.status(500).json({ error: 'Failed to get cached users' });
  }
});

// Get cached groups
router.get('/ad/groups', authenticateToken, (req, res) => {
  try {
    const groups = activeDirectoryService.getAllCachedGroups();
    
    res.json({
      success: true,
      groups
    });
  } catch (error) {
    logger.error('Get cached groups error:', error);
    res.status(500).json({ error: 'Failed to get cached groups' });
  }
});

// Get active sessions
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const sessions = Array.from(userSessions.values()).map(session => ({
      userId: session.user.id,
      username: session.user.username,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      source: session.user.source
    }));

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Revoke session
router.delete('/sessions/:userId', authenticateToken, (req, res) => {
  try {
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { userId } = req.params;
    const session = userSessions.get(userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    userSessions.delete(userId);
    
    logger.info(`Session revoked for user ${session.user.username}`);
    
    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

module.exports = {
  router,
  authenticateToken,
  generateToken,
  verifyToken
};
