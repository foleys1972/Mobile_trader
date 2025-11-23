# Trading Intercom System

A comprehensive real-time voice communication platform for trading floors with enterprise features, compliance, and federation capabilities.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Redis** (for caching and real-time data)
- **MongoDB** (optional, for persistent storage)
- **Active Directory** (optional, for enterprise authentication)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Mobile_trader
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. **Set up environment variables**
```bash
# Copy environment template
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

4. **Start the system**
```bash
# Start backend server
cd server
npm run dev

# Start frontend (in new terminal)
cd client
npm start
```

## 📋 System Requirements

### Backend Dependencies
- Node.js 18+
- Redis 6+
- MongoDB 5+ (optional)
- WebRTC support
- Audio codec support (Opus)

### Frontend Dependencies
- Modern web browser with WebRTC support
- HTTPS for production (required for WebRTC)
- Audio device access

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
SERVER_ID=intercom-server-01

# Recording Configuration
RECORDING_OUTPUT_DIR=./recordings
RECORDING_ENCRYPTION=true
RECORDING_RETENTION_DAYS=2555
RECORDING_EMAIL_DELIVERY=true
MAX_EMAIL_SIZE_MB=25

# Email Configuration
SMTP_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM="Trading Intercom <noreply@trading-intercom.com>"

# MediaSoup Configuration
MEDIASOUP_LISTEN_IP=127.0.0.1
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100

# Matrix.org Configuration
MATRIX_HOMESERVER_URL=https://matrix.org
MATRIX_ACCESS_TOKEN=your_matrix_access_token
MATRIX_ENABLED=true

# Active Directory Configuration
AD_ENABLED=true
AD_URL=ldap://your-ad-server.com:389
AD_BASE_DN=dc=company,dc=com
AD_BIND_DN=cn=admin,dc=company,dc=com
AD_BIND_PASSWORD=your_ad_password

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Federation Configuration
FEDERATION_ENABLED=true
FEDERATION_PORT=3002
FEDERATION_SECRET=your-federation-secret
FEDERATION_PEERS=[]

# Encryption Configuration
ENCRYPTION_ENABLED=true
ENCRYPTION_KEY_DERIVATION=pbkdf2
ENCRYPTION_KEY_STORAGE=file

# Compliance Configuration
COMPLIANCE_ENABLED=true
COMPLIANCE_REGULATIONS=mifid2,dodd-frank,sox
COMPLIANCE_RETENTION_PERIOD=2555
COMPLIANCE_AUDIT_LOGGING=true
```

## 🏃‍♂️ Running the System

### Development Mode

1. **Start Redis** (if not already running)
```bash
redis-server
```

2. **Start Backend Server**
```bash
cd server
npm run dev
```

3. **Start Frontend** (in new terminal)
```bash
cd client
npm start
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Federation: ws://localhost:3002

### Production Mode

1. **Build Frontend**
```bash
cd client
npm run build
```

2. **Start Production Server**
```bash
cd server
npm start
```

## 🔐 Authentication

### Default Users

The system comes with default users for testing:

- **Admin**: username: `admin`, password: `admin123`
- **Trader**: username: `trader`, password: `password`

### Active Directory Integration

To enable AD authentication:

1. Configure AD settings in `.env`
2. Set `AD_ENABLED=true`
3. Restart the server

## 🌐 Federation Setup

### Matrix.org Federation

1. **Get Matrix Access Token**
   - Create account at https://matrix.org
   - Generate access token
   - Add to `.env` file

2. **Configure Matrix Settings**
```env
MATRIX_ENABLED=true
MATRIX_HOMESERVER_URL=https://matrix.org
MATRIX_ACCESS_TOKEN=your_token_here
```

### Server-to-Server Federation

1. **Configure Federation Peers**
```env
FEDERATION_PEERS='[
  {
    "serverId": "intercom-server-02",
    "serverName": "Trading Intercom Server 02",
    "serverUrl": "ws://server02.example.com:3002",
    "isActive": true
  }
]'
```

2. **Start Federation Server**
```bash
# Federation runs on port 3002 by default
# Configure FEDERATION_PORT in .env if needed
```

## 📊 Monitoring & Management

### Admin Portal

Access the admin portal at: http://localhost:3000/admin

Features:
- User management
- Group management
- Recording management
- Compliance dashboard
- Federation management

### API Endpoints

- **Authentication**: `/api/auth/*`
- **Recordings**: `/api/recordings/*`
- **Groups**: `/api/groups/*`
- **WebRTC**: `/api/webrtc/*`
- **Matrix**: `/api/matrix/*`
- **Compliance**: `/api/compliance/*`
- **Federation**: `/api/federation/*`

## 🔧 Troubleshooting

### Common Issues

1. **WebRTC Not Working**
   - Ensure HTTPS in production
   - Check browser permissions for microphone
   - Verify MediaSoup configuration

2. **Redis Connection Issues**
   - Check Redis is running: `redis-cli ping`
   - Verify Redis configuration in `.env`

3. **Matrix Federation Issues**
   - Verify Matrix credentials
   - Check network connectivity
   - Review Matrix server logs

4. **Active Directory Issues**
   - Verify LDAP connection
   - Check AD credentials
   - Review AD server logs

### Logs

- **Backend logs**: Check console output
- **Frontend logs**: Browser developer tools
- **Redis logs**: `redis-cli monitor`
- **System logs**: Check system logs for errors

## 📱 Mobile Support

The system is a Progressive Web App (PWA) that works on:

- **Desktop browsers** (Chrome, Firefox, Safari, Edge)
- **Mobile browsers** (iOS Safari, Chrome Mobile)
- **Tablets** (iPad, Android tablets)

### Mobile Installation

1. Open the app in mobile browser
2. Look for "Add to Home Screen" option
3. Install as native app

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS** (required for WebRTC)
2. **Secure Redis** with authentication
3. **Encrypt sensitive data** at rest
4. **Use strong passwords** for all services
5. **Enable firewall** rules for federation ports
6. **Regular security updates**

### Compliance

The system includes built-in compliance features:

- **MiFID II** compliance
- **Dodd-Frank** compliance
- **SOX** compliance
- **Audio recording** with retention policies
- **Audit logging** for all activities
- **Data encryption** for sensitive information

## 🚀 Deployment Options

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up -d
```

### Cloud Deployment

- **AWS**: Use EC2, RDS, ElastiCache
- **Azure**: Use App Service, Cosmos DB, Redis Cache
- **GCP**: Use Compute Engine, Cloud SQL, Memorystore

### Load Balancing

For high availability:
- Use multiple server instances
- Configure load balancer
- Set up Redis cluster
- Use database replication

## 📞 Support

For technical support:
- Check the logs for error messages
- Review the configuration
- Test individual components
- Contact system administrator

## 🔄 Updates

To update the system:

1. **Backup** current configuration
2. **Pull** latest changes
3. **Install** new dependencies
4. **Update** environment variables
5. **Restart** services

## 📈 Performance

### Optimization Tips

1. **Use Redis** for caching
2. **Enable compression** for federation
3. **Configure CDN** for static assets
4. **Monitor** system resources
5. **Scale** horizontally as needed

### Monitoring

- **CPU usage**: Monitor server resources
- **Memory usage**: Check for memory leaks
- **Network**: Monitor bandwidth usage
- **Database**: Check query performance
- **Redis**: Monitor cache hit rates

---

**Happy Trading! 🎯📞**