const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initializeMatrixClient } = require('./services/matrixService');
const { initializeMediaSoup } = require('./services/mediaSoupService');
const { initializeSIPGateway } = require('./services/sipService');
const { initializeDatabase } = require('./services/databaseService');
const { initializeRedis } = require('./services/redisService');
const { setupRoutes } = require('./routes');
const recordingRoutes = require('./routes');
const { setupSocketHandlers } = require('./socketHandlers');
const { setupAudioRecording } = require('./services/audioRecordingService');
const logger = require('./utils/logger');

class TradingIntercomServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.port = process.env.PORT || 5000;
    this.mediaSoupWorker = null;
    this.matrixClient = null;
    this.sipGateway = null;
    this.redisClient = null;
  }

  async initialize() {
    try {
      logger.info('Initializing Trading Intercom Server...');
      
      // Initialize core services
      await this.setupMiddleware();
      await initializeDatabase();
      this.redisClient = await initializeRedis();
      this.mediaSoupWorker = await initializeMediaSoup();
      this.matrixClient = await initializeMatrixClient();
      this.sipGateway = await initializeSIPGateway();
      
      // Setup routes and socket handlers
      this.app.use('/api', recordingRoutes);
      setupSocketHandlers(this.io, {
        mediaSoupWorker: this.mediaSoupWorker,
        matrixClient: this.matrixClient,
        sipGateway: this.sipGateway,
        redisClient: this.redisClient
      });
      
      // Initialize audio recording service
      await setupAudioRecording(this.mediaSoupWorker);
      
      logger.info('Server initialization completed successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error);
      throw error;
    }
  }

  async setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "ws:", "wss:"],
          mediaSrc: ["'self'", "blob:"],
        },
      },
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files from React build
    this.app.use(express.static(path.join(__dirname, '../client/build')));
  }

  async start() {
    try {
      await this.initialize();
      
      this.server.listen(this.port, () => {
        logger.info(`Trading Intercom Server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Matrix Server: ${process.env.MATRIX_SERVER_URL || 'Not configured'}`);
        logger.info(`SIP Gateway: ${this.sipGateway ? 'Enabled' : 'Disabled'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down server gracefully...');
    
    try {
      if (this.mediaSoupWorker) {
        await this.mediaSoupWorker.close();
      }
      
      if (this.matrixClient) {
        await this.matrixClient.stopClient();
      }
      
      if (this.sipGateway) {
        await this.sipGateway.stop();
      }
      
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      
      this.server.close(() => {
        logger.info('Server shutdown complete');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new TradingIntercomServer();
server.start().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = TradingIntercomServer;
