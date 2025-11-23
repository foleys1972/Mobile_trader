# Direct Trader Communications - Windows Testing Guide

## Overview

This guide covers testing the Direct Trader Communications platform on Windows, focusing on backend API testing and deployment options.

## Prerequisites

### Required Software
- **Python 3.11+** - [Download from python.org](https://www.python.org/downloads/)
- **Git** - [Download from git-scm.com](https://git-scm.com/download/win)
- **PowerShell 5.1+** (included with Windows 10/11)
- **curl** - [Download from curl.se](https://curl.se/windows/) or use Windows 10+ built-in curl

### Optional Software
- **Postman** - [Download from postman.com](https://www.postman.com/downloads/) (for API testing)
- **VS Code** - [Download from code.visualstudio.com](https://code.visualstudio.com/) (for code editing)

## Quick Start Testing

### 1. Setup Testing Environment

```powershell
# Run the setup script
.\scripts\setup_testing.bat
```

This will:
- Install Python dependencies
- Create virtual environment
- Set up test data
- Create test scripts

### 2. Test Backend API

#### Option A: Using Batch Script
```cmd
scripts\test_backend.bat
```

#### Option B: Using PowerShell
```powershell
.\scripts\test_backend.ps1
```

#### Option C: Manual Testing
```powershell
# Navigate to backend directory
cd Backend\API

# Activate virtual environment
venv\Scripts\activate

# Start the server
python main.py
```

The API will be available at: `http://localhost:8000`

### 3. Test API Endpoints

#### Health Check
```powershell
curl http://localhost:8000/health
```

#### Configure Test Bank
```powershell
curl -X POST http://localhost:8000/banks/demo_bank/configure `
  -H "Content-Type: application/json" `
  -d @test_data\sample_bank_config.json
```

#### Test DND Functionality
```powershell
# Enable DND
curl -X POST http://localhost:8000/dnd/user123/enable

# Check DND status
curl http://localhost:8000/dnd/user123/status

# Disable DND
curl -X POST http://localhost:8000/dnd/user123/disable
```

#### Test Hoot Line Monitoring
```powershell
# Start monitoring
curl -X POST http://localhost:8000/hoot-lines/hoot-1/monitor `
  -H "Content-Type: application/json" `
  -d '{"user_id": "user123", "muted": true}'

# Get audio activity
curl http://localhost:8000/hoot-lines/hoot-1/audio-activity

# Toggle mute
curl -X POST http://localhost:8000/hoot-lines/hoot-1/toggle-mute `
  -H "Content-Type: application/json" `
  -d '{"user_id": "user123"}'
```

## Detailed Testing Scenarios

### 1. Backend API Testing

#### Test All Endpoints
```powershell
# 1. Health Check
curl http://localhost:8000/health

# 2. Configure Bank
curl -X POST http://localhost:8000/banks/test_bank/configure `
  -H "Content-Type: application/json" `
  -d '{
    "bank_id": "test_bank",
    "bank_name": "Test Bank",
    "oracle_sbc_host": "sbc.test.com",
    "audiocodes_host": "audiocodes.test.com",
    "sip_domain": "test.com",
    "lines": [
      {
        "id": "hoot-1",
        "name": "Test Trading Floor",
        "number": "1001",
        "type": "hoot",
        "status": "active",
        "participants": []
      }
    ]
  }'

# 3. Get Bank Lines
curl http://localhost:8000/banks/test_bank/lines

# 4. Get Lines by Type
curl http://localhost:8000/banks/test_bank/lines/hoot

# 5. Initiate Call
curl -X POST http://localhost:8000/calls/initiate `
  -H "Content-Type: application/json" `
  -d '{"line_id": "hoot-1", "bank_id": "test_bank"}'

# 6. Get Active Calls
curl http://localhost:8000/calls/active
```

#### Test DND System
```powershell
# Enable DND
curl -X POST http://localhost:8000/dnd/user123/enable

# Check DND Status
curl http://localhost:8000/dnd/user123/status

# Schedule DND
curl -X POST http://localhost:8000/dnd/user123/schedule `
  -H "Content-Type: application/json" `
  -d '{"start_time": "09:00", "end_time": "17:00"}'

# Add Allowed Caller
curl -X POST http://localhost:8000/dnd/user123/allowed-callers `
  -H "Content-Type: application/json" `
  -d '{"caller_address": "sip:emergency@bank.com"}'

# Disable DND
curl -X POST http://localhost:8000/dnd/user123/disable
```

#### Test Hoot Line Monitoring
```powershell
# Start Monitoring
curl -X POST http://localhost:8000/hoot-lines/hoot-1/monitor `
  -H "Content-Type: application/json" `
  -d '{"user_id": "user123", "muted": true}'

# Get Audio Activity
curl http://localhost:8000/hoot-lines/hoot-1/audio-activity

# Toggle Mute
curl -X POST http://localhost:8000/hoot-lines/hoot-1/toggle-mute `
  -H "Content-Type: application/json" `
  -d '{"user_id": "user123"}'

# Stop Monitoring
curl -X POST http://localhost:8000/hoot-lines/hoot-1/stop-monitoring `
  -H "Content-Type: application/json" `
  -d '{"user_id": "user123"}'
```

### 2. Using Postman for API Testing

#### Import API Collection
1. Open Postman
2. Click "Import"
3. Create a new collection called "Direct Trader API"
4. Add the following requests:

**Health Check**
- Method: GET
- URL: `http://localhost:8000/health`

**Configure Bank**
- Method: POST
- URL: `http://localhost:8000/banks/demo_bank/configure`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "bank_id": "demo_bank",
  "bank_name": "Demo Trading Bank",
  "oracle_sbc_host": "sbc.demo.com",
  "audiocodes_host": "audiocodes.demo.com",
  "sip_domain": "demo.com",
  "lines": [
    {
      "id": "hoot-1",
      "name": "Trading Floor",
      "number": "1001",
      "type": "hoot",
      "status": "active",
      "participants": []
    }
  ]
}
```

**Enable DND**
- Method: POST
- URL: `http://localhost:8000/dnd/user123/enable`

**Start Hoot Monitoring**
- Method: POST
- URL: `http://localhost:8000/hoot-lines/hoot-1/monitor`
- Body (raw JSON):
```json
{
  "user_id": "user123",
  "muted": true
}
```

### 3. Performance Testing

#### Load Testing with PowerShell
```powershell
# Test multiple concurrent requests
$jobs = @()
for ($i = 1; $i -le 10; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url)
        Invoke-RestMethod -Uri $url -Method Get
    } -ArgumentList "http://localhost:8000/health"
}

# Wait for all jobs to complete
$jobs | Wait-Job | Receive-Job
$jobs | Remove-Job
```

#### Memory Usage Testing
```powershell
# Monitor Python process memory usage
Get-Process python | Select-Object ProcessName, Id, WorkingSet, VirtualMemorySize
```

## Deployment Testing

### 1. Railway Deployment

#### Setup Railway CLI
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy to Railway
railway up
```

#### Test Deployed API
```powershell
# Get the deployed URL from Railway
$railwayUrl = "https://your-app-name.railway.app"

# Test health check
curl $railwayUrl/health

# Test bank configuration
curl -X POST "$railwayUrl/banks/demo_bank/configure" `
  -H "Content-Type: application/json" `
  -d @test_data\sample_bank_config.json
```

### 2. Replit Deployment

1. Go to [Replit](https://replit.com)
2. Create new Python repl
3. Upload the `Backend/API/` files
4. Run the application
5. Test the deployed URL

## Troubleshooting

### Common Issues

#### Python Not Found
```powershell
# Check Python installation
python --version

# If not found, install Python 3.11+ from python.org
```

#### Virtual Environment Issues
```powershell
# Recreate virtual environment
cd Backend\API
Remove-Item -Recurse -Force venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

#### Port Already in Use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process
taskkill /PID <process_id> /F
```

#### CORS Issues
```powershell
# Test CORS with different origins
curl -H "Origin: http://localhost:3000" http://localhost:8000/health
```

### Debug Commands

#### Check API Status
```powershell
# Test basic connectivity
Test-NetConnection -ComputerName localhost -Port 8000

# Check if API is responding
Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing
```

#### Monitor Logs
```powershell
# Start backend with verbose logging
cd Backend\API
venv\Scripts\activate
python main.py --log-level debug
```

## Test Data

### Sample Bank Configuration
```json
{
  "bank_id": "demo_bank",
  "bank_name": "Demo Trading Bank",
  "oracle_sbc_host": "sbc.demo.com",
  "oracle_sbc_port": 5061,
  "audiocodes_host": "audiocodes.demo.com",
  "audiocodes_port": 5060,
  "sip_domain": "demo.com",
  "lines": [
    {
      "id": "hoot-1",
      "name": "Trading Floor",
      "number": "1001",
      "type": "hoot",
      "status": "active",
      "participants": ["Trader A", "Trader B", "Manager"]
    },
    {
      "id": "ard-1",
      "name": "Emergency Line",
      "number": "2001",
      "type": "ard",
      "status": "ready",
      "participants": []
    },
    {
      "id": "mrd-1",
      "name": "Client A",
      "number": "3001",
      "type": "mrd",
      "status": "ready",
      "participants": []
    }
  ]
}
```

### Test User Credentials
- **User ID**: `user123`
- **Bank ID**: `demo_bank`
- **Server**: `localhost:8000` (local) or Railway URL (deployed)

## Success Criteria

### Backend API
- ✅ All endpoints respond correctly
- ✅ CORS headers are set properly
- ✅ Error handling works
- ✅ Data persistence functions
- ✅ Logging works correctly

### Integration
- ✅ API connects to database (when implemented)
- ✅ Real-time updates work
- ✅ Authentication functions (when implemented)
- ✅ Rate limiting works (when implemented)

## Next Steps

After successful testing:

1. **Deploy to Production**: Use Railway or Replit for production deployment
2. **Set up Monitoring**: Add application monitoring and logging
3. **Performance Optimization**: Based on test results
4. **Security Testing**: Test authentication and authorization
5. **Load Testing**: Test with higher concurrent users

## iOS App Testing (macOS Required)

For iOS app testing, you'll need:
- **macOS with Xcode** (for iOS development)
- **iPhone or iPad** (for device testing)
- **Apple Developer Account** (for device testing)

The iOS app can be tested on macOS by:
1. Opening `iOS/DirectTrader.xcworkspace` in Xcode
2. Selecting iPhone 15 Pro simulator
3. Building and running the app
4. Testing all features as described in the main Testing Guide

The Windows environment is perfect for backend API testing and development!
