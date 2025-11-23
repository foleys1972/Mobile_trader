const mongoose = require('mongoose');
const logger = require('../utils/logger');

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'trader', 'supervisor', 'compliance'], default: 'trader' },
  permissions: [{ type: String }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  adUserId: { type: String }, // Active Directory user ID
  adGroups: [{ type: String }], // Active Directory groups
});

// Group Schema
const groupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['trading', 'compliance', 'admin', 'broadcast'], default: 'trading' },
  isPublic: { type: Boolean, default: false },
  maxParticipants: { type: Number, default: 200 },
  allowRecording: { type: Boolean, default: true },
  pushToTalk: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  matrixRoomId: { type: String },
  sipEnabled: { type: Boolean, default: false },
  sipNumbers: [{ type: String }],
  retentionPolicy: {
    retentionDays: { type: Number, default: 2555 },
    emailDelivery: { type: Boolean, default: false },
    emailRecipients: [{ type: String }],
    emailSchedule: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Recording Schema
const recordingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  groupId: { type: String, required: true },
  userId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number }, // in milliseconds
  filePath: { type: String },
  metadataPath: { type: String },
  participants: [{ type: String }],
  retentionPolicy: {
    retentionDays: { type: Number },
    emailDelivery: { type: Boolean },
    emailRecipients: [{ type: String }],
    emailSchedule: { type: String }
  },
  emailSent: { type: Boolean, default: false },
  retentionExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  metadata: {
    serverId: { type: String },
    recordingFormat: { type: String },
    sampleRate: { type: Number },
    channels: { type: Number },
    bitDepth: { type: Number },
    encryption: { type: Boolean },
    sequenceNumber: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Server Schema
const serverSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  host: { type: String, required: true },
  port: { type: Number, required: true },
  matrixServerUrl: { type: String },
  matrixRoomId: { type: String },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  capabilities: {
    maxUsers: { type: Number, default: 500 },
    maxGroups: { type: Number, default: 100 },
    recordingEnabled: { type: Boolean, default: true },
    sipEnabled: { type: Boolean, default: false },
    matrixEnabled: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const Recording = mongoose.model('Recording', recordingSchema);
const Server = mongoose.model('Server', serverSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

async function initializeDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading-intercom';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Connected to MongoDB database');
    
    // Create indexes
    await createIndexes();
    
    return {
      User,
      Group,
      Recording,
      Server,
      AuditLog,
    };
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function createIndexes() {
  try {
    // User indexes
    await User.createIndex({ username: 1 });
    await User.createIndex({ email: 1 });
    await User.createIndex({ adUserId: 1 });
    await User.createIndex({ isActive: 1 });

    // Group indexes
    await Group.createIndex({ name: 1 });
    await Group.createIndex({ type: 1 });
    await Group.createIndex({ isActive: 1 });
    await Group.createIndex({ createdBy: 1 });

    // Recording indexes
    await Recording.createIndex({ sessionId: 1 });
    await Recording.createIndex({ groupId: 1 });
    await Recording.createIndex({ userId: 1 });
    await Recording.createIndex({ startTime: 1 });
    await Recording.createIndex({ isActive: 1 });
    await Recording.createIndex({ retentionExpiry: 1 });

    // Server indexes
    await Server.createIndex({ host: 1, port: 1 });
    await Server.createIndex({ isActive: 1 });

    // Audit log indexes
    await AuditLog.createIndex({ userId: 1 });
    await AuditLog.createIndex({ action: 1 });
    await AuditLog.createIndex({ timestamp: 1 });
    await AuditLog.createIndex({ resource: 1, resourceId: 1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Failed to create database indexes:', error);
    throw error;
  }
}

// User operations
async function createUser(userData) {
  try {
    const user = new User(userData);
    await user.save();
    logger.info(`User created: ${user.username}`);
    return user;
  } catch (error) {
    logger.error('Failed to create user:', error);
    throw error;
  }
}

async function getUserById(userId) {
  try {
    return await User.findOne({ id: userId, isActive: true });
  } catch (error) {
    logger.error('Failed to get user by ID:', error);
    throw error;
  }
}

async function getUserByUsername(username) {
  try {
    return await User.findOne({ username, isActive: true });
  } catch (error) {
    logger.error('Failed to get user by username:', error);
    throw error;
  }
}

async function getUserByEmail(email) {
  try {
    return await User.findOne({ email, isActive: true });
  } catch (error) {
    logger.error('Failed to get user by email:', error);
    throw error;
  }
}

async function updateUser(userId, updateData) {
  try {
    updateData.updatedAt = new Date();
    return await User.findOneAndUpdate(
      { id: userId },
      updateData,
      { new: true }
    );
  } catch (error) {
    logger.error('Failed to update user:', error);
    throw error;
  }
}

async function deleteUser(userId) {
  try {
    return await User.findOneAndUpdate(
      { id: userId },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    logger.error('Failed to delete user:', error);
    throw error;
  }
}

// Group operations
async function createGroup(groupData) {
  try {
    const group = new Group(groupData);
    await group.save();
    logger.info(`Group created: ${group.name}`);
    return group;
  } catch (error) {
    logger.error('Failed to create group:', error);
    throw error;
  }
}

async function getGroupById(groupId) {
  try {
    return await Group.findOne({ id: groupId, isActive: true }).populate('participants');
  } catch (error) {
    logger.error('Failed to get group by ID:', error);
    throw error;
  }
}

async function getGroupsByUser(userId) {
  try {
    return await Group.find({ 
      participants: userId, 
      isActive: true 
    }).populate('participants');
  } catch (error) {
    logger.error('Failed to get groups by user:', error);
    throw error;
  }
}

async function addUserToGroup(groupId, userId) {
  try {
    return await Group.findOneAndUpdate(
      { id: groupId },
      { $addToSet: { participants: userId }, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    logger.error('Failed to add user to group:', error);
    throw error;
  }
}

async function removeUserFromGroup(groupId, userId) {
  try {
    return await Group.findOneAndUpdate(
      { id: groupId },
      { $pull: { participants: userId }, updatedAt: new Date() },
      { new: true }
    );
  } catch (error) {
    logger.error('Failed to remove user from group:', error);
    throw error;
  }
}

// Recording operations
async function createRecording(recordingData) {
  try {
    const recording = new Recording(recordingData);
    await recording.save();
    logger.info(`Recording created: ${recording.id}`);
    return recording;
  } catch (error) {
    logger.error('Failed to create recording:', error);
    throw error;
  }
}

async function getRecordingById(recordingId) {
  try {
    return await Recording.findOne({ id: recordingId });
  } catch (error) {
    logger.error('Failed to get recording by ID:', error);
    throw error;
  }
}

async function getRecordingsByGroup(groupId, limit = 50, skip = 0) {
  try {
    return await Recording.find({ groupId })
      .sort({ startTime: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    logger.error('Failed to get recordings by group:', error);
    throw error;
  }
}

async function updateRecording(recordingId, updateData) {
  try {
    updateData.updatedAt = new Date();
    return await Recording.findOneAndUpdate(
      { id: recordingId },
      updateData,
      { new: true }
    );
  } catch (error) {
    logger.error('Failed to update recording:', error);
    throw error;
  }
}

// Audit log operations
async function createAuditLog(auditData) {
  try {
    const auditLog = new AuditLog(auditData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    throw error;
  }
}

async function getAuditLogs(filters = {}, limit = 100, skip = 0) {
  try {
    return await AuditLog.find(filters)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    throw error;
  }
}

// Server operations
async function registerServer(serverData) {
  try {
    const existingServer = await Server.findOne({ id: serverData.id });
    
    if (existingServer) {
      return await Server.findOneAndUpdate(
        { id: serverData.id },
        { ...serverData, lastSeen: new Date(), updatedAt: new Date() },
        { new: true }
      );
    } else {
      const server = new Server(serverData);
      await server.save();
      logger.info(`Server registered: ${server.name}`);
      return server;
    }
  } catch (error) {
    logger.error('Failed to register server:', error);
    throw error;
  }
}

async function getActiveServers() {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return await Server.find({ 
      isActive: true, 
      lastSeen: { $gte: fiveMinutesAgo } 
    });
  } catch (error) {
    logger.error('Failed to get active servers:', error);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  createIndexes,
  User,
  Group,
  Recording,
  Server,
  AuditLog,
  // User operations
  createUser,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  updateUser,
  deleteUser,
  // Group operations
  createGroup,
  getGroupById,
  getGroupsByUser,
  addUserToGroup,
  removeUserFromGroup,
  // Recording operations
  createRecording,
  getRecordingById,
  getRecordingsByGroup,
  updateRecording,
  // Audit operations
  createAuditLog,
  getAuditLogs,
  // Server operations
  registerServer,
  getActiveServers,
};
