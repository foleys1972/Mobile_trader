const dgram = require('dgram');
const net = require('net');
const logger = require('../utils/logger');

class SIPGateway {
  constructor() {
    this.isEnabled = process.env.SIP_ENABLED === 'true';
    this.host = process.env.SIP_HOST || 'localhost';
    this.port = parseInt(process.env.SIP_PORT) || 5060;
    this.username = process.env.SIP_USERNAME;
    this.password = process.env.SIP_PASSWORD;
    this.domain = process.env.SIP_DOMAIN;
    
    this.socket = null;
    this.connected = false;
    this.callId = 1;
    this.activeCalls = new Map();
    this.sipUsers = new Map();
    this.sequence = 1;
    
    if (this.isEnabled) {
      this.initialize();
    }
  }

  async initialize() {
    try {
      logger.info('Initializing SIP Gateway...');
      
      // Create UDP socket for SIP
      this.socket = dgram.createSocket('udp4');
      
      this.socket.on('message', (msg, rinfo) => {
        this.handleSIPMessage(msg.toString(), rinfo);
      });
      
      this.socket.on('error', (err) => {
        logger.error('SIP socket error:', err);
      });
      
      this.socket.bind(this.port, () => {
        logger.info(`SIP Gateway listening on ${this.host}:${this.port}`);
        this.connected = true;
      });
      
      // Register with SIP server if credentials provided
      if (this.username && this.password && this.domain) {
        await this.register();
      }
      
    } catch (error) {
      logger.error('Failed to initialize SIP Gateway:', error);
      throw error;
    }
  }

  async register() {
    try {
      const callId = this.generateCallId();
      const fromTag = this.generateTag();
      const toTag = this.generateTag();
      
      const registerMessage = this.buildSIPMessage('REGISTER', {
        'Via': `SIP/2.0/UDP ${this.host}:${this.port};branch=${this.generateBranch()}`,
        'From': `<sip:${this.username}@${this.domain}>;tag=${fromTag}`,
        'To': `<sip:${this.username}@${this.domain}>;tag=${toTag}`,
        'Call-ID': callId,
        'CSeq': `${this.sequence} REGISTER`,
        'Contact': `<sip:${this.username}@${this.host}:${this.port}>`,
        'Expires': '3600',
        'User-Agent': 'Trading-Intercom-SIP-Gateway/1.0',
        'Content-Length': '0'
      });

      await this.sendSIPMessage(registerMessage);
      logger.info(`SIP registration sent for ${this.username}@${this.domain}`);
      
    } catch (error) {
      logger.error('Failed to register with SIP server:', error);
    }
  }

  handleSIPMessage(message, rinfo) {
    try {
      const lines = message.split('\r\n');
      const requestLine = lines[0];
      const headers = this.parseHeaders(lines.slice(1, -1));
      
      logger.debug(`Received SIP message from ${rinfo.address}:${rinfo.port}:`, requestLine);
      
      if (requestLine.startsWith('SIP/2.0')) {
        // Response
        this.handleSIPResponse(requestLine, headers, rinfo);
      } else {
        // Request
        this.handleSIPRequest(requestLine, headers, rinfo);
      }
      
    } catch (error) {
      logger.error('Failed to handle SIP message:', error);
    }
  }

  handleSIPRequest(requestLine, headers, rinfo) {
    const [method, uri, version] = requestLine.split(' ');
    
    switch (method) {
      case 'INVITE':
        this.handleInvite(uri, headers, rinfo);
        break;
      case 'BYE':
        this.handleBye(uri, headers, rinfo);
        break;
      case 'ACK':
        this.handleAck(uri, headers, rinfo);
        break;
      case 'CANCEL':
        this.handleCancel(uri, headers, rinfo);
        break;
      case 'OPTIONS':
        this.handleOptions(uri, headers, rinfo);
        break;
      default:
        this.sendSIPResponse(405, 'Method Not Allowed', headers, rinfo);
    }
  }

  handleSIPResponse(responseLine, headers, rinfo) {
    const [version, statusCode, reasonPhrase] = responseLine.split(' ');
    
    logger.debug(`SIP response: ${statusCode} ${reasonPhrase}`);
    
    switch (statusCode) {
      case '200':
        this.handleSuccessResponse(headers);
        break;
      case '401':
        this.handleAuthChallenge(headers, rinfo);
        break;
      case '407':
        this.handleProxyAuthChallenge(headers, rinfo);
        break;
      default:
        logger.warn(`Unhandled SIP response: ${statusCode} ${reasonPhrase}`);
    }
  }

  async handleInvite(uri, headers, rinfo) {
    try {
      const callId = headers['Call-ID'];
      const from = headers['From'];
      const to = headers['To'];
      
      logger.info(`SIP INVITE received from ${from} to ${to}`);
      
      // Create call session
      const call = {
        id: callId,
        from: from,
        to: to,
        remoteAddress: rinfo.address,
        remotePort: rinfo.port,
        status: 'ringing',
        createdAt: new Date(),
      };
      
      this.activeCalls.set(callId, call);
      
      // Send 100 Trying
      await this.sendSIPResponse(100, 'Trying', headers, rinfo);
      
      // Send 180 Ringing
      await this.sendSIPResponse(180, 'Ringing', headers, rinfo);
      
      // Send 200 OK with SDP
      const sdp = this.generateSDP();
      await this.sendSIPResponse(200, 'OK', {
        ...headers,
        'Content-Type': 'application/sdp',
        'Content-Length': sdp.length.toString()
      }, rinfo, sdp);
      
      // Notify WebRTC clients about incoming call
      this.notifyWebRTCClients('sip-incoming-call', {
        callId,
        from,
        to,
        sdp
      });
      
    } catch (error) {
      logger.error('Failed to handle SIP INVITE:', error);
      await this.sendSIPResponse(500, 'Internal Server Error', headers, rinfo);
    }
  }

  async handleBye(uri, headers, rinfo) {
    const callId = headers['Call-ID'];
    const call = this.activeCalls.get(callId);
    
    if (call) {
      call.status = 'ended';
      this.activeCalls.delete(callId);
      
      // Notify WebRTC clients
      this.notifyWebRTCClients('sip-call-ended', { callId });
      
      logger.info(`SIP call ${callId} ended`);
    }
    
    await this.sendSIPResponse(200, 'OK', headers, rinfo);
  }

  async handleAck(uri, headers, rinfo) {
    const callId = headers['Call-ID'];
    const call = this.activeCalls.get(callId);
    
    if (call) {
      call.status = 'active';
      logger.info(`SIP call ${callId} is now active`);
    }
  }

  async handleCancel(uri, headers, rinfo) {
    const callId = headers['Call-ID'];
    const call = this.activeCalls.get(callId);
    
    if (call) {
      call.status = 'cancelled';
      this.activeCalls.delete(callId);
      
      // Notify WebRTC clients
      this.notifyWebRTCClients('sip-call-cancelled', { callId });
      
      logger.info(`SIP call ${callId} cancelled`);
    }
    
    await this.sendSIPResponse(200, 'OK', headers, rinfo);
  }

  async handleOptions(uri, headers, rinfo) {
    await this.sendSIPResponse(200, 'OK', headers, rinfo);
  }

  async handleSuccessResponse(headers) {
    logger.info('SIP registration successful');
  }

  async handleAuthChallenge(headers, rinfo) {
    // Handle 401 Unauthorized
    logger.info('SIP authentication challenge received');
  }

  async handleProxyAuthChallenge(headers, rinfo) {
    // Handle 407 Proxy Authentication Required
    logger.info('SIP proxy authentication challenge received');
  }

  async sendSIPMessage(message) {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(message);
      this.socket.send(buffer, 0, buffer.length, this.port, this.host, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async sendSIPResponse(statusCode, reasonPhrase, headers, rinfo, body = '') {
    const response = this.buildSIPResponse(statusCode, reasonPhrase, headers, body);
    await this.sendSIPMessage(response);
  }

  buildSIPMessage(method, headers) {
    let message = `${method} sip:${this.domain} SIP/2.0\r\n`;
    
    for (const [key, value] of Object.entries(headers)) {
      message += `${key}: ${value}\r\n`;
    }
    
    message += '\r\n';
    return message;
  }

  buildSIPResponse(statusCode, reasonPhrase, headers, body = '') {
    let response = `SIP/2.0 ${statusCode} ${reasonPhrase}\r\n`;
    
    for (const [key, value] of Object.entries(headers)) {
      response += `${key}: ${value}\r\n`;
    }
    
    if (body) {
      response += `Content-Length: ${body.length}\r\n`;
    }
    
    response += '\r\n';
    if (body) {
      response += body;
    }
    
    return response;
  }

  parseHeaders(headerLines) {
    const headers = {};
    
    for (const line of headerLines) {
      if (line.trim()) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
    }
    
    return headers;
  }

  generateSDP() {
    const sessionId = Math.floor(Math.random() * 1000000);
    const version = 0;
    
    return `v=${version}
o=TradingIntercom ${sessionId} ${sessionId} IN IP4 ${this.host}
s=Trading Intercom Session
c=IN IP4 ${this.host}
t=0 0
m=audio 5060 RTP/AVP 0 8 96
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:96 opus/48000/2
a=sendrecv
`;
  }

  generateCallId() {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTag() {
    return Math.random().toString(36).substr(2, 9);
  }

  generateBranch() {
    return `z9hG4bK${Math.random().toString(36).substr(2, 9)}`;
  }

  // WebRTC to SIP bridging
  async bridgeWebRTCToSIP(webrtcCallId, sipUri) {
    try {
      const callId = this.generateCallId();
      const fromTag = this.generateTag();
      const toTag = this.generateTag();
      
      const inviteMessage = this.buildSIPMessage('INVITE', {
        'Via': `SIP/2.0/UDP ${this.host}:${this.port};branch=${this.generateBranch()}`,
        'From': `<sip:${this.username}@${this.domain}>;tag=${fromTag}`,
        'To': `<sip:${sipUri}>;tag=${toTag}`,
        'Call-ID': callId,
        'CSeq': `${this.sequence} INVITE`,
        'Contact': `<sip:${this.username}@${this.host}:${this.port}>`,
        'Content-Type': 'application/sdp',
        'User-Agent': 'Trading-Intercom-SIP-Gateway/1.0',
        'Content-Length': '0'
      });

      await this.sendSIPMessage(inviteMessage);
      
      // Store bridge mapping
      this.activeCalls.set(callId, {
        id: callId,
        webrtcCallId,
        sipUri,
        status: 'bridging',
        createdAt: new Date(),
      });
      
      logger.info(`Bridging WebRTC call ${webrtcCallId} to SIP ${sipUri}`);
      
    } catch (error) {
      logger.error('Failed to bridge WebRTC to SIP:', error);
      throw error;
    }
  }

  // SIP to WebRTC bridging
  async bridgeSIPToWebRTC(sipCallId, webrtcRoomId) {
    try {
      const call = this.activeCalls.get(sipCallId);
      if (!call) {
        throw new Error('SIP call not found');
      }

      // Notify WebRTC clients about SIP call
      this.notifyWebRTCClients('sip-call-bridge', {
        sipCallId,
        webrtcRoomId,
        from: call.from,
        to: call.to,
      });
      
      logger.info(`Bridging SIP call ${sipCallId} to WebRTC room ${webrtcRoomId}`);
      
    } catch (error) {
      logger.error('Failed to bridge SIP to WebRTC:', error);
      throw error;
    }
  }

  // Notify WebRTC clients
  notifyWebRTCClients(event, data) {
    // This would be implemented to notify WebRTC clients via Socket.IO
    logger.debug(`Notifying WebRTC clients: ${event}`, data);
  }

  // Get active calls
  getActiveCalls() {
    return Array.from(this.activeCalls.values());
  }

  // Get call by ID
  getCall(callId) {
    return this.activeCalls.get(callId);
  }

  // End call
  async endCall(callId) {
    try {
      const call = this.activeCalls.get(callId);
      if (!call) {
        throw new Error('Call not found');
      }

      // Send BYE message
      const byeMessage = this.buildSIPMessage('BYE', {
        'Via': `SIP/2.0/UDP ${this.host}:${this.port};branch=${this.generateBranch()}`,
        'From': call.from,
        'To': call.to,
        'Call-ID': callId,
        'CSeq': `${this.sequence} BYE`,
        'User-Agent': 'Trading-Intercom-SIP-Gateway/1.0',
        'Content-Length': '0'
      });

      await this.sendSIPMessage(byeMessage);
      
      call.status = 'ended';
      this.activeCalls.delete(callId);
      
      logger.info(`SIP call ${callId} ended`);
      
    } catch (error) {
      logger.error('Failed to end SIP call:', error);
      throw error;
    }
  }

  // Stop gateway
  async stop() {
    try {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      this.connected = false;
      this.activeCalls.clear();
      
      logger.info('SIP Gateway stopped');
    } catch (error) {
      logger.error('Failed to stop SIP Gateway:', error);
    }
  }
}

async function initializeSIPGateway() {
  try {
    if (process.env.SIP_ENABLED !== 'true') {
      logger.info('SIP Gateway disabled');
      return null;
    }

    const sipGateway = new SIPGateway();
    logger.info('SIP Gateway initialized successfully');
    return sipGateway;
  } catch (error) {
    logger.error('Failed to initialize SIP Gateway:', error);
    throw error;
  }
}

module.exports = {
  initializeSIPGateway,
  SIPGateway,
};
