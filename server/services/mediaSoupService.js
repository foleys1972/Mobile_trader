const mediasoup = require('mediasoup');
const logger = require('../utils/logger');

let worker = null;
let router = null;

const mediaSoupConfig = {
  worker: {
    rtcMinPort: parseInt(process.env.RTC_MIN_PORT) || 10000,
    rtcMaxPort: parseInt(process.env.RTC_MAX_PORT) || 20000,
    logLevel: process.env.MEDIASOUP_LOG_LEVEL || 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ],
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
          useinbandfec: 1,
          minptime: 10,
          maxplaybackrate: 48000,
        },
      },
      {
        kind: 'audio',
        mimeType: 'audio/PCMU',
        clockRate: 8000,
        channels: 1,
      },
      {
        kind: 'audio',
        mimeType: 'audio/PCMA',
        clockRate: 8000,
        channels: 1,
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: process.env.LISTEN_IP || '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP,
      },
    ],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  },
};

async function initializeMediaSoup() {
  try {
    logger.info('Initializing MediaSoup worker...');
    
    worker = await mediasoup.createWorker({
      logLevel: mediaSoupConfig.worker.logLevel,
      logTags: mediaSoupConfig.worker.logTags,
      rtcMinPort: mediaSoupConfig.worker.rtcMinPort,
      rtcMaxPort: mediaSoupConfig.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      logger.error('MediaSoup worker died, exiting in 2 seconds...');
      setTimeout(() => process.exit(1), 2000);
    });

    // Create router
    router = await worker.createRouter({
      mediaCodecs: mediaSoupConfig.router.mediaCodecs,
    });

    logger.info('MediaSoup worker initialized successfully');
    return worker;
  } catch (error) {
    logger.error('Failed to initialize MediaSoup worker:', error);
    throw error;
  }
}

async function createWebRtcTransport(socketId, direction = 'sendrecv') {
  try {
    const transport = await router.createWebRtcTransport({
      listenIps: mediaSoupConfig.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      maxIncomingBitrate: mediaSoupConfig.webRtcTransport.maxIncomingBitrate,
      initialAvailableOutgoingBitrate: mediaSoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
    });

    // Handle ICE candidates
    transport.on('icegatheringstatechange', (iceGatheringState) => {
      logger.debug(`ICE gathering state changed: ${iceGatheringState}`);
    });

    transport.on('iceconnectionstatechange', (iceConnectionState) => {
      logger.debug(`ICE connection state changed: ${iceConnectionState}`);
    });

    transport.on('dtlsstatechange', (dtlsState) => {
      logger.debug(`DTLS state changed: ${dtlsState}`);
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
      transport: transport,
    };
  } catch (error) {
    logger.error('Failed to create WebRTC transport:', error);
    throw error;
  }
}

async function createProducer(transport, kind, rtpParameters) {
  try {
    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: {
        kind,
        timestamp: Date.now(),
      },
    });

    producer.on('transportclose', () => {
      logger.debug('Producer transport closed');
    });

    producer.on('score', (score) => {
      logger.debug(`Producer score: ${JSON.stringify(score)}`);
    });

    return producer;
  } catch (error) {
    logger.error('Failed to create producer:', error);
    throw error;
  }
}

async function createConsumer(transport, producerId, rtpCapabilities) {
  try {
    if (!router.canConsume({
      producerId,
      rtpCapabilities,
    })) {
      throw new Error('Cannot consume from this producer');
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false,
    });

    consumer.on('transportclose', () => {
      logger.debug('Consumer transport closed');
    });

    consumer.on('producerclose', () => {
      logger.debug('Producer closed, closing consumer');
      consumer.close();
    });

    return consumer;
  } catch (error) {
    logger.error('Failed to create consumer:', error);
    throw error;
  }
}

function getRouterRtpCapabilities() {
  return router.rtpCapabilities;
}

function getProducerStats(producerId) {
  return router.getProducerStats(producerId);
}

function getConsumerStats(consumerId) {
  return router.getConsumerStats(consumerId);
}

function closeTransport(transportId) {
  const transport = router.getTransportById(transportId);
  if (transport) {
    transport.close();
  }
}

function closeProducer(producerId) {
  const producer = router.getProducerById(producerId);
  if (producer) {
    producer.close();
  }
}

function closeConsumer(consumerId) {
  const consumer = router.getConsumerById(consumerId);
  if (consumer) {
    consumer.close();
  }
}

module.exports = {
  initializeMediaSoup,
  createWebRtcTransport,
  createProducer,
  createConsumer,
  getRouterRtpCapabilities,
  getProducerStats,
  getConsumerStats,
  closeTransport,
  closeProducer,
  closeConsumer,
  getWorker: () => worker,
  getRouter: () => router,
};
