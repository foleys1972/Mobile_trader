# Direct Trader Communications - Deployment Guide

## Overview

This guide covers deploying the Direct Trader Communications platform using zero-budget infrastructure (Railway and Replit) for production-ready deployment.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   iOS App       │    │   Backend API   │    │   Infrastructure│
│   (Linphone)    │◄──►│   (FastAPI)     │◄──►│   (Railway)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Oracle SBC    │
                       │   AudioCodes    │
                       └─────────────────┘
```

## Prerequisites

- Xcode 15.0+ for iOS development
- Python 3.11+ for backend
- Railway account (free tier)
- Replit account (free tier)
- Oracle SBC access (bank infrastructure)
- AudioCodes access (bank infrastructure)

## Deployment Options

### Option 1: Railway (Recommended)

Railway provides the most robust production deployment with automatic scaling and monitoring.

#### 1. Setup Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy backend
railway up
```

#### 2. Configure Environment Variables

In Railway dashboard, set:
```
PORT=8000
PYTHONPATH=/app/Backend/API
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

#### 3. Deploy Backend

```bash
# Deploy from project root
railway deploy
```

#### 4. Configure Custom Domain

- Go to Railway dashboard
- Select your project
- Go to Settings > Domains
- Add custom domain: `api.directtrader.com`

### Option 2: Replit (Alternative)

Replit provides a simpler deployment option for development and testing.

#### 1. Import Project to Replit

1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Select "Import from GitHub"
4. Enter repository URL
5. Choose "Python" template

#### 2. Configure Replit

1. Open `.replit` file
2. Ensure Python 3.11 is selected
3. Set environment variables in Replit Secrets

#### 3. Deploy

1. Click "Run" button
2. Replit will automatically install dependencies
3. Backend will start on port 8000

## iOS App Deployment

### 1. Xcode Configuration

```bash
# Open project in Xcode
open iOS/DirectTrader.xcodeproj

# Install CocoaPods dependencies
cd iOS
pod install
```

### 2. Configure API Endpoints

Update `LinphoneManager.swift`:

```swift
private let apiBaseURL = "https://direct-trader-api.railway.app"
// or for Replit: "https://your-repl-name.your-username.repl.co"
```

### 3. Build and Archive

1. Select "Any iOS Device" as target
2. Product > Archive
3. Distribute App > Ad Hoc Distribution
4. Export for development/testing

### 4. TestFlight Deployment

1. Upload to App Store Connect
2. Add test users
3. Distribute via TestFlight
4. Submit for App Store review

## Oracle SBC Integration

### 1. Configure SIP Settings

```python
# In LinphoneManager.swift, configure:
oracle_sbc_host = "sbc.bank.com"
oracle_sbc_port = 5061
sip_domain = "bank.com"
```

### 2. SSL/TLS Configuration

```swift
// Configure TLS for secure SIP
linphone_config_set_string(config, "sip", "transport", "tls")
linphone_config_set_string(config, "sip", "tls_cert_path", "/path/to/cert.pem")
```

### 3. Authentication

```swift
// Register with Oracle SBC
let identity = "sip:\(username)@\(sip_domain)"
let authInfo = linphone_auth_info_new(username, nil, password, nil, nil, nil)
```

## AudioCodes Integration

### 1. Configure AudioCodes Gateway

```python
# Backend configuration
audiocodes_host = "audiocodes.bank.com"
audiocodes_port = 5060
```

### 2. Audio Quality Settings

```swift
// Configure for trading environment
linphone_config_set_int(config, "sound", "sample_rate", 16000)
linphone_config_set_string(config, "sound", "echo_cancellation", "yes")
```

## White-label Configuration

### 1. Bank Branding

Create `branding/` directory with bank-specific assets:

```
branding/
├── bank_001/
│   ├── logo.png
│   ├── colors.json
│   └── config.json
└── bank_002/
    ├── logo.png
    └── colors.json
```

### 2. Dynamic Configuration

```swift
// Load bank-specific configuration
func loadBankConfiguration(bankId: String) {
    let configURL = "\(apiBaseURL)/banks/\(bankId)/branding"
    // Load and apply branding
}
```

## Production Checklist

### Security
- [ ] Enable HTTPS for all endpoints
- [ ] Implement proper authentication (JWT/OAuth)
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates
- [ ] Enable rate limiting

### Performance
- [ ] Configure Redis for session management
- [ ] Set up database connection pooling
- [ ] Enable CDN for static assets
- [ ] Configure auto-scaling
- [ ] Set up monitoring and alerting

### Monitoring
- [ ] Set up application monitoring (Sentry)
- [ ] Configure log aggregation
- [ ] Set up health checks
- [ ] Monitor call quality metrics
- [ ] Track usage analytics

## Cost Analysis

### Railway (Production)
- **Free Tier**: $0/month (500 hours)
- **Pro Tier**: $5/month (unlimited)
- **Database**: $5/month (PostgreSQL)
- **Total**: $10/month

### Replit (Development)
- **Free Tier**: $0/month
- **Hacker Plan**: $7/month (always-on)
- **Total**: $0-7/month

### iOS App Store
- **Developer Account**: $99/year
- **App Store**: 30% revenue share
- **Total**: $99/year + 30% revenue

## Scaling Strategy

### Phase 1: MVP (0-10 banks)
- Single Railway deployment
- In-memory storage
- Basic monitoring

### Phase 2: Growth (10-100 banks)
- Database migration (PostgreSQL)
- Redis for sessions
- Load balancing

### Phase 3: Scale (100+ banks)
- Microservices architecture
- Kubernetes deployment
- Advanced monitoring

## Troubleshooting

### Common Issues

1. **Linphone SDK Issues**
   - Ensure proper audio permissions
   - Check microphone access
   - Verify network connectivity

2. **Oracle SBC Connection**
   - Verify SIP credentials
   - Check firewall settings
   - Test with SIP client

3. **AudioCodes Integration**
   - Verify gateway configuration
   - Check audio codec settings
   - Test call quality

### Support Channels

- **Documentation**: `/Documentation/`
- **API Docs**: `/Documentation/API_Documentation.md`
- **Issues**: GitHub Issues
- **Email**: support@directtrader.com

## Revenue Model

### Pricing Tiers
- **Starter**: $50/trader/month (1-10 traders)
- **Professional**: $100/trader/month (11-50 traders)
- **Enterprise**: $150/trader/month (50+ traders)

### White-label Licensing
- **Setup Fee**: $5,000 per bank
- **Monthly Fee**: $500 per bank
- **Custom Development**: $200/hour

### Projected Revenue
- **Year 1**: $50,000 (10 banks, 100 traders)
- **Year 2**: $500,000 (50 banks, 1,000 traders)
- **Year 3**: $2,000,000 (100 banks, 5,000 traders)

