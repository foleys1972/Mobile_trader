# 🚀 Quick Start Guide

Get the Trading Intercom System running in 5 minutes!

## 📋 Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Redis** (optional but recommended) - [Download here](https://redis.io/download)
- **Modern web browser** with WebRTC support

## ⚡ Quick Setup

### Windows Users

1. **Run the setup script**
   ```cmd
   scripts\setup-windows.bat
   ```

2. **Start the system**
   ```cmd
   scripts\start-dev.bat
   ```

3. **Open your browser**
   - Go to: http://localhost:3000
   - Login with: `admin` / `admin123`

### Linux/Mac Users

1. **Run the setup script**
   ```bash
   chmod +x scripts/setup-linux.sh
   ./scripts/setup-linux.sh
   ```

2. **Start the system**
   ```bash
   chmod +x scripts/start-dev.sh
   ./scripts/start-dev.sh
   ```

3. **Open your browser**
   - Go to: http://localhost:3000
   - Login with: `admin` / `admin123`

## 🐳 Docker Users

1. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 🔧 Manual Setup

If you prefer manual setup:

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example server/.env

# Edit configuration
nano server/.env
```

### 3. Start Services

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm start
```

## 🌐 Access the System

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Federation**: ws://localhost:3002

## 👤 Default Users

- **Admin**: username=`admin`, password=`admin123`
- **Trader**: username=`trader`, password=`password`

## 🎯 First Steps

1. **Login** with admin credentials
2. **Create a group** in the admin panel
3. **Join the group** from the dashboard
4. **Test audio** with microphone permissions
5. **Configure federation** (optional)

## 🔧 Configuration

### Essential Settings

Edit `server/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Redis (optional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Recording
RECORDING_ENCRYPTION=true
RECORDING_RETENTION_DAYS=2555

# Email (optional)
SMTP_ENABLED=false
```

### Advanced Settings

- **Matrix Federation**: Set `MATRIX_ENABLED=true`
- **Active Directory**: Set `AD_ENABLED=true`
- **SIP Integration**: Configure SIP settings
- **Compliance**: Set `COMPLIANCE_ENABLED=true`

## 🚨 Troubleshooting

### Common Issues

1. **WebRTC not working**
   - Check browser permissions
   - Ensure HTTPS in production
   - Verify microphone access

2. **Redis connection failed**
   - Start Redis: `redis-server`
   - Check Redis configuration
   - Verify Redis is running: `redis-cli ping`

3. **Port already in use**
   - Change ports in `.env`
   - Kill existing processes
   - Use different ports

4. **Dependencies failed**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall
   - Check Node.js version

### Getting Help

- Check the logs in the console
- Review the README.md for detailed documentation
- Check browser developer tools for errors
- Verify all services are running

## 📱 Mobile Access

The system works on mobile devices:

1. **Open in mobile browser**
2. **Allow microphone permissions**
3. **Add to home screen** (PWA)
4. **Use like a native app**

## 🔒 Security Notes

- **Change default passwords** in production
- **Use HTTPS** for production deployment
- **Configure firewall** rules
- **Enable encryption** for sensitive data
- **Regular updates** for security patches

## 🎉 You're Ready!

The Trading Intercom System is now running! 

- **Test audio communication**
- **Create and manage groups**
- **Configure federation**
- **Set up compliance features**
- **Deploy to production**

Happy trading! 🎯📞
