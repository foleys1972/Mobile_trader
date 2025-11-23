# Flutter Setup Guide for Direct Trader Communications

## Overview

This guide will help you set up Flutter on Windows and run the Direct Trader Communications app without needing Xcode or macOS.

## Prerequisites

- **Windows 10/11** (64-bit)
- **8GB RAM** minimum (16GB recommended)
- **10GB free disk space**
- **Internet connection**

## Step 1: Install Flutter

### Download Flutter SDK
1. Go to: https://flutter.dev/docs/get-started/install/windows
2. Download the latest stable release
3. Extract to `C:\flutter` (or any location you prefer)

### Add Flutter to PATH
1. Open **System Properties** → **Environment Variables**
2. Under **System Variables**, find **Path** and click **Edit**
3. Click **New** and add: `C:\flutter\bin`
4. Click **OK** to save

### Verify Installation
```bash
# Open Command Prompt or PowerShell
flutter --version
flutter doctor
```

## Step 2: Install Required Tools

### Install Git
1. Download from: https://git-scm.com/download/win
2. Install with default settings
3. Verify: `git --version`

### Install Visual Studio Code (Recommended)
1. Download from: https://code.visualstudio.com/
2. Install Flutter extension
3. Install Dart extension

### Install Android Studio (Optional)
1. Download from: https://developer.android.com/studio
2. Install Android SDK
3. Set up Android emulator

## Step 3: Set Up Flutter Project

### Navigate to Project
```bash
cd C:\Projects\Mobile_trader\flutter_app
```

### Install Dependencies
```bash
flutter pub get
```

### Check Flutter Doctor
```bash
flutter doctor
```

## Step 4: Run the App

### Option A: Run on Web (Easiest)
```bash
# Start web server
flutter run -d chrome

# Or specify web server
flutter run -d web-server --web-port 8080
```

### Option B: Run on Windows Desktop
```bash
# Enable Windows desktop support
flutter config --enable-windows-desktop

# Run on Windows
flutter run -d windows
```

### Option C: Run on Android (if you have Android Studio)
```bash
# List available devices
flutter devices

# Run on Android device/emulator
flutter run -d android
```

## Step 5: Build for Production

### Build Web App
```bash
# Build for web
flutter build web

# Output will be in: build/web/
# Deploy this folder to any web server
```

### Build Windows Desktop App
```bash
# Build for Windows
flutter build windows

# Output will be in: build/windows/runner/Release/
# Create installer with: flutter build windows --release
```

### Build Android APK
```bash
# Build APK
flutter build apk

# Output will be in: build/app/outputs/flutter-apk/
# Install on Android devices
```

## Step 6: Deploy to Production

### Web Deployment
1. Build web app: `flutter build web`
2. Upload `build/web/` folder to any web server
3. Access via browser on any device

### Android Deployment
1. Build APK: `flutter build apk`
2. Install on Android devices
3. Submit to Google Play Store

### iOS Deployment (Cloud Build)
1. Push code to GitHub
2. Use Codemagic or similar service
3. Build iOS app in the cloud
4. Download signed IPA file

## Troubleshooting

### Common Issues

#### Flutter Doctor Issues
```bash
# Fix common issues
flutter doctor --android-licenses
flutter config --android-sdk <path-to-android-sdk>
```

#### Web Development Issues
```bash
# Enable web support
flutter config --enable-web

# Clear cache
flutter clean
flutter pub get
```

#### Windows Desktop Issues
```bash
# Enable Windows desktop
flutter config --enable-windows-desktop

# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
```

### Performance Tips

#### For Web Development
- Use Chrome for testing
- Enable hardware acceleration
- Use `flutter run -d chrome --web-renderer html` for better compatibility

#### For Desktop Development
- Use `flutter run -d windows --release` for better performance
- Enable hardware acceleration in Windows

## Development Workflow

### 1. Start Development Server
```bash
# Web development
flutter run -d chrome

# Desktop development
flutter run -d windows

# Hot reload: Press 'r' in terminal
# Hot restart: Press 'R' in terminal
```

### 2. Make Changes
- Edit code in `lib/` directory
- Save changes
- See updates instantly (hot reload)

### 3. Test Features
- Test on web browser
- Test on Windows desktop
- Test on Android (if available)

### 4. Build for Production
```bash
# Build web app
flutter build web

# Build Windows app
flutter build windows

# Build Android app
flutter build apk
```

## Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── models/                  # Data models
│   ├── providers/               # State management
│   ├── screens/                 # UI screens
│   ├── widgets/                 # Reusable widgets
│   └── services/                # Business logic
├── assets/                      # Images, fonts, sounds
├── pubspec.yaml                 # Dependencies
└── README.md                    # Project documentation
```

## Key Features

### VoIP Integration
- **Linphone Flutter**: VoIP calling
- **WebRTC**: Audio/video communication
- **Permission Handling**: Microphone access

### State Management
- **Provider**: Reactive state management
- **ChangeNotifier**: UI updates
- **Shared Preferences**: Local storage

### UI Components
- **Material Design**: Modern UI
- **Responsive Layout**: All screen sizes
- **Custom Widgets**: Trading-specific components

## Next Steps

1. **Install Flutter**: Follow Step 1
2. **Set Up Project**: Follow Step 2
3. **Run App**: Follow Step 4
4. **Develop Features**: Add your custom features
5. **Build & Deploy**: Follow Step 6

## Support

- **Flutter Documentation**: https://flutter.dev/docs
- **Flutter Community**: https://flutter.dev/community
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/flutter

Happy Flutter Development! 🚀
