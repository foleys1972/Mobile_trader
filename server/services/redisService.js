const redis = require('redis');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  }

  async initialize() {
    try {
      logger.info('Initializing Redis connection...');
      
      this.client = redis.createClient({
        url: this.redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      
      return this.client;
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  // Session management
  async setSession(sessionId, sessionData, ttl = 3600) {
    try {
      const key = `session:${sessionId}`;
      await this.client.setEx(key, ttl, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      logger.error('Failed to set session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      const key = `session:${sessionId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw error;
    }
  }

  // User presence
  async setUserPresence(userId, presenceData, ttl = 300) {
    try {
      const key = `presence:${userId}`;
      await this.client.setEx(key, ttl, JSON.stringify(presenceData));
      return true;
    } catch (error) {
      logger.error('Failed to set user presence:', error);
      throw error;
    }
  }

  async getUserPresence(userId) {
    try {
      const key = `presence:${userId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get user presence:', error);
      throw error;
    }
  }

  async deleteUserPresence(userId) {
    try {
      const key = `presence:${userId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete user presence:', error);
      throw error;
    }
  }

  // Room management
  async setRoomData(roomId, roomData, ttl = 3600) {
    try {
      const key = `room:${roomId}`;
      await this.client.setEx(key, ttl, JSON.stringify(roomData));
      return true;
    } catch (error) {
      logger.error('Failed to set room data:', error);
      throw error;
    }
  }

  async getRoomData(roomId) {
    try {
      const key = `room:${roomId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get room data:', error);
      throw error;
    }
  }

  async deleteRoomData(roomId) {
    try {
      const key = `room:${roomId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete room data:', error);
      throw error;
    }
  }

  // Group management
  async setGroupData(groupId, groupData, ttl = 3600) {
    try {
      const key = `group:${groupId}`;
      await this.client.setEx(key, ttl, JSON.stringify(groupData));
      return true;
    } catch (error) {
      logger.error('Failed to set group data:', error);
      throw error;
    }
  }

  async getGroupData(groupId) {
    try {
      const key = `group:${groupId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get group data:', error);
      throw error;
    }
  }

  async deleteGroupData(groupId) {
    try {
      const key = `group:${groupId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete group data:', error);
      throw error;
    }
  }

  // Recording management
  async setRecordingData(recordingId, recordingData, ttl = 86400) {
    try {
      const key = `recording:${recordingId}`;
      await this.client.setEx(key, ttl, JSON.stringify(recordingData));
      return true;
    } catch (error) {
      logger.error('Failed to set recording data:', error);
      throw error;
    }
  }

  async getRecordingData(recordingId) {
    try {
      const key = `recording:${recordingId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get recording data:', error);
      throw error;
    }
  }

  async deleteRecordingData(recordingId) {
    try {
      const key = `recording:${recordingId}`;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete recording data:', error);
      throw error;
    }
  }

  // Server federation
  async setServerData(serverId, serverData, ttl = 300) {
    try {
      const key = `server:${serverId}`;
      await this.client.setEx(key, ttl, JSON.stringify(serverData));
      return true;
    } catch (error) {
      logger.error('Failed to set server data:', error);
      throw error;
    }
  }

  async getServerData(serverId) {
    try {
      const key = `server:${serverId}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get server data:', error);
      throw error;
    }
  }

  async getAllServers() {
    try {
      const keys = await this.client.keys('server:*');
      const servers = [];
      
      for (const key of keys) {
        const data = await this.client.get(key);
        if (data) {
          servers.push(JSON.parse(data));
        }
      }
      
      return servers;
    } catch (error) {
      logger.error('Failed to get all servers:', error);
      throw error;
    }
  }

  // Message queuing
  async pushMessage(queueName, message) {
    try {
      const key = `queue:${queueName}`;
      await this.client.lPush(key, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('Failed to push message:', error);
      throw error;
    }
  }

  async popMessage(queueName, timeout = 0) {
    try {
      const key = `queue:${queueName}`;
      const result = await this.client.brPop(key, timeout);
      return result ? JSON.parse(result.element) : null;
    } catch (error) {
      logger.error('Failed to pop message:', error);
      throw error;
    }
  }

  // Rate limiting
  async checkRateLimit(key, limit, window) {
    try {
      const current = await this.client.incr(key);
      
      if (current === 1) {
        await this.client.expire(key, window);
      }
      
      return current <= limit;
    } catch (error) {
      logger.error('Failed to check rate limit:', error);
      throw error;
    }
  }

  // Pub/Sub
  async publish(channel, message) {
    try {
      await this.client.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message) => {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch (error) {
          logger.error('Failed to parse subscribed message:', error);
        }
      });
      
      return subscriber;
    } catch (error) {
      logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  // Cache operations
  async setCache(key, value, ttl = 3600) {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Failed to set cache:', error);
      throw error;
    }
  }

  async getCache(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get cache:', error);
      throw error;
    }
  }

  async deleteCache(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Failed to delete cache:', error);
      throw error;
    }
  }

  // Statistics
  async getStats() {
    try {
      const info = await this.client.info();
      const keys = await this.client.dbSize();
      
      return {
        connected: this.isConnected,
        keys,
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      throw error;
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const stats = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    }
    
    return stats;
  }

  // Cleanup
  async cleanup() {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
      }
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Failed to cleanup Redis:', error);
    }
  }
}

async function initializeRedis() {
  try {
    const redisService = new RedisService();
    await redisService.initialize();
    return redisService;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

module.exports = {
  initializeRedis,
  RedisService,
};
