# Direct Trader Communications - Testing Guide

## Overview

This guide covers testing the complete Direct Trader Communications platform, including the iOS app, backend API, and all integrated features.

## Prerequisites

### Development Environment
- **Xcode 15.0+** (for iOS development)
- **Python 3.11+** (for backend testing)
- **iOS Simulator** or **Physical iPhone** (iOS 17.0+)
- **Terminal/Command Line** access

### Accounts Needed
- **Apple Developer Account** (for device testing)
- **Railway Account** (for backend deployment)
- **Replit Account** (alternative backend deployment)

## Testing Setup

### 1. iOS App Testing

#### Step 1: Open Project in Xcode
```bash
# Navigate to iOS directory
cd iOS

# Install CocoaPods dependencies
pod install

# Open project in Xcode
open DirectTrader.xcworkspace
```

#### Step 2: Configure for Testing
1. **Select Target Device**: Choose iPhone 15 Pro simulator or connected device
2. **Set Bundle Identifier**: Update to your developer account
3. **Configure Signing**: Set up code signing for your team

#### Step 3: Build and Run
1. **Product → Build** (⌘+B)
2. **Product → Run** (⌘+R)
3. **Wait for app to launch** in simulator/device

### 2. Backend API Testing

#### Option A: Local Testing
```bash
# Navigate to backend directory
cd Backend/API

# Install dependencies
pip install -r requirements.txt

# Run the API server
python main.py
```

The API will be available at: `http://localhost:8000`

#### Option B: Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy to Railway
railway up
```

#### Option C: Replit Deployment
1. Go to [Replit](https://replit.com)
2. Create new Python repl
3. Upload the `Backend/API/` files
4. Run the application

## Feature Testing Scenarios

### 1. Basic App Launch Test

**Objective**: Verify app launches and displays main interface

**Steps**:
1. Launch the app
2. Verify you see the trading board interface
3. Check that all tabs are visible:
   - Hoot Lines
   - ARD Lines  
   - MRD Lines
   - DND
   - Settings

**Expected Result**: 
- App launches without crashes
- Main interface displays correctly
- All navigation tabs are functional

### 2. Hoot Lines Testing

**Objective**: Test hoot line functionality and monitoring features

**Steps**:
1. **Navigate to Hoot Lines tab**
2. **Test Line Display**:
   - Verify hoot lines are displayed in grid
   - Check line names and numbers
   - Verify status indicators

3. **Test Join Options**:
   - Tap on a hoot line
   - Verify monitor options sheet appears
   - Test all three options:
     - "Join Active" (full participation)
     - "Monitor (Muted)" (silent monitoring)
     - "Monitor with Notifications" (monitoring + alerts)

4. **Test Monitoring Features**:
   - Start monitoring a line
   - Verify status indicators show "Monitoring (Muted)"
   - Test mute/unmute toggle
   - Test stop monitoring

**Expected Results**:
- Options sheet displays correctly
- Monitoring starts/stops properly
- Status indicators update in real-time
- Mute toggle works correctly

### 3. ARD Lines Testing

**Objective**: Test Auto Ring Down functionality

**Steps**:
1. **Navigate to ARD Lines tab**
2. **Test ARD Connection**:
   - Tap "Connect" on an ARD line
   - Verify warning dialog appears
   - Test "Continue" and "Cancel" options
   - Verify warning tone plays (if implemented)

3. **Test ARD Features**:
   - Test warning tone button
   - Verify connection status updates
   - Test call termination

**Expected Results**:
- Warning dialog appears before connection
- ARD lines connect with warning tone
- Status updates correctly

### 4. MRD Lines Testing

**Objective**: Test Manual Ring Down functionality

**Steps**:
1. **Navigate to MRD Lines tab**
2. **Test MRD Connection**:
   - Tap "Call" on an MRD line
   - Verify ringing status
   - Test call duration timer
   - Test mute/unmute during call
   - Test speaker toggle

3. **Test Call Management**:
   - Test answer call functionality
   - Test end call functionality
   - Verify call status updates

**Expected Results**:
- MRD lines ring before connecting
- Call duration timer works
- Mute/speaker controls function
- Call status updates correctly

### 5. Do Not Disturb (DND) Testing

**Objective**: Test DND functionality and call blocking

**Steps**:
1. **Navigate to DND tab**
2. **Test DND Toggle**:
   - Toggle DND on/off
   - Verify status indicators
   - Check notification appearance

3. **Test Scheduled DND**:
   - Tap "Schedule DND"
   - Set start and end times
   - Verify schedule is saved
   - Test schedule cancellation

4. **Test Allowed Callers**:
   - Add allowed caller
   - Remove allowed caller
   - Test emergency override toggle

5. **Test Call Blocking**:
   - Enable DND
   - Attempt to make calls
   - Verify calls are blocked
   - Check blocked calls log

**Expected Results**:
- DND toggle works instantly
- Scheduled DND activates/deactivates automatically
- Allowed callers can bypass DND
- Emergency calls always allowed
- Blocked calls are logged

### 6. Settings Testing

**Objective**: Test app configuration and connection settings

**Steps**:
1. **Navigate to Settings tab**
2. **Test Connection Settings**:
   - Enter server address
   - Enter username/password
   - Tap "Connect"
   - Verify connection status

3. **Test Status Display**:
   - Check connection indicator
   - Verify active calls count
   - Test app information display

**Expected Results**:
- Settings save correctly
- Connection status updates
- Status information displays

## Backend API Testing

### 1. Health Check Test

```bash
# Test API health
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-13T10:30:00Z"
}
```

### 2. Bank Configuration Test

```bash
# Configure a test bank
curl -X POST http://localhost:8000/banks/test_bank/configure \
  -H "Content-Type: application/json" \
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
```

### 3. DND API Testing

```bash
# Enable DND for user
curl -X POST http://localhost:8000/dnd/user123/enable

# Check DND status
curl http://localhost:8000/dnd/user123/status

# Schedule DND
curl -X POST http://localhost:8000/dnd/user123/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "09:00",
    "end_time": "17:00"
  }'
```

### 4. Hoot Line Monitoring Test

```bash
# Start monitoring
curl -X POST http://localhost:8000/hoot-lines/hoot-1/monitor \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "muted": true
  }'

# Get audio activity
curl http://localhost:8000/hoot-lines/hoot-1/audio-activity

# Toggle mute
curl -X POST http://localhost:8000/hoot-lines/hoot-1/toggle-mute \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123"}'
```

## Integration Testing

### 1. iOS App + Backend Integration

**Objective**: Test iOS app communication with backend API

**Steps**:
1. **Start Backend API** (local or deployed)
2. **Launch iOS App**
3. **Configure Connection**:
   - Go to Settings tab
   - Enter backend URL (localhost:8000 or Railway URL)
   - Enter test credentials
   - Tap "Connect"

4. **Test API Integration**:
   - Verify connection status shows "Connected"
   - Test hoot line monitoring
   - Test DND functionality
   - Verify data synchronization

**Expected Results**:
- App connects to backend successfully
- Data syncs between app and API
- All features work with backend integration

### 2. Linphone SDK Integration

**Objective**: Test VoIP functionality (requires actual SIP server)

**Steps**:
1. **Configure SIP Server**:
   - Set up test SIP server (FreeSWITCH, Asterisk, etc.)
   - Configure server details in app
   - Test registration

2. **Test Call Functionality**:
   - Test outgoing calls
   - Test incoming calls
   - Test call quality
   - Test mute/unmute

**Expected Results**:
- SIP registration successful
- Calls connect properly
- Audio quality is good
- Call controls work correctly

## Performance Testing

### 1. Memory Usage Test

**Objective**: Verify app doesn't have memory leaks

**Steps**:
1. **Open Xcode Instruments**
2. **Select "Leaks" template**
3. **Run app for 30+ minutes**
4. **Monitor memory usage**
5. **Check for memory leaks**

**Expected Results**:
- No memory leaks detected
- Memory usage remains stable
- App performance doesn't degrade

### 2. Battery Usage Test

**Objective**: Test battery consumption during monitoring

**Steps**:
1. **Start hoot line monitoring**
2. **Leave app running for 2+ hours**
3. **Check battery usage in Settings**
4. **Monitor background activity**

**Expected Results**:
- Reasonable battery consumption
- Background monitoring works efficiently
- No excessive CPU usage

## Troubleshooting

### Common Issues

1. **App Won't Launch**
   - Check Xcode version compatibility
   - Verify iOS deployment target
   - Check code signing settings

2. **Backend Connection Failed**
   - Verify backend is running
   - Check network connectivity
   - Verify API endpoints

3. **Linphone SDK Issues**
   - Check microphone permissions
   - Verify audio session configuration
   - Test with different devices

4. **DND Not Working**
   - Check notification permissions
   - Verify DND settings persistence
   - Test with different scenarios

### Debug Tools

1. **Xcode Console**: View app logs and errors
2. **Network Inspector**: Monitor API calls
3. **Instruments**: Profile performance
4. **Backend Logs**: Check server-side logs

## Test Data

### Sample Bank Configuration
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
      "status": "active"
    },
    {
      "id": "ard-1", 
      "name": "Emergency Line",
      "number": "2001",
      "type": "ard",
      "status": "ready"
    },
    {
      "id": "mrd-1",
      "name": "Client A",
      "number": "3001", 
      "type": "mrd",
      "status": "ready"
    }
  ]
}
```

### Test User Credentials
- **Username**: `test_user`
- **Password**: `test_password`
- **Server**: `localhost:8000` (local) or Railway URL (deployed)

## Success Criteria

### iOS App
- ✅ App launches without crashes
- ✅ All UI elements display correctly
- ✅ Navigation works smoothly
- ✅ Hoot line monitoring functions
- ✅ DND system works properly
- ✅ Settings save and load correctly

### Backend API
- ✅ All endpoints respond correctly
- ✅ Data persistence works
- ✅ Error handling functions
- ✅ CORS configured properly
- ✅ Logging works correctly

### Integration
- ✅ iOS app connects to backend
- ✅ Data syncs between app and API
- ✅ Real-time updates work
- ✅ Offline functionality works

## Next Steps

After successful testing:

1. **Deploy to Production**: Use Railway or Replit for production deployment
2. **App Store Submission**: Prepare for iOS App Store submission
3. **User Testing**: Conduct user acceptance testing with traders
4. **Performance Optimization**: Based on test results
5. **Documentation**: Update user guides and API documentation

The application is now ready for comprehensive testing across all features and integration points!
