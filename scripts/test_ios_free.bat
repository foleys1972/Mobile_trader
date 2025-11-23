@echo off
REM Free iOS Testing Helper Script
REM This script helps you test your iOS app for free

echo ============================================
echo 🆓 Free iOS App Testing Helper
echo ============================================
echo.

echo 📋 Available Free Testing Options:
echo.
echo 1. Appetize.io (Browser-based iOS Simulator)
echo    - Free: 100 minutes/month
echo    - Upload IPA and test in browser
echo    - Website: https://appetize.io
echo.
echo 2. Codemagic (Cloud iOS Builds)
echo    - Free: 500 build minutes/month
echo    - Build iOS apps without Mac
echo    - Website: https://codemagic.io
echo.
echo 3. LambdaTest (Real Device Testing)
echo    - Free trial available
echo    - Test on real iOS devices
echo    - Website: https://www.lambdatest.com
echo.
echo 4. GitHub Actions (CI/CD)
echo    - Free: 2000 minutes/month (public repos)
echo    - Automated iOS builds
echo    - Website: https://github.com/features/actions
echo.
echo ============================================
echo.

REM Check if Flutter is installed
where flutter >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Flutter not found!
    echo.
    echo Please install Flutter first:
    echo   scripts\install_flutter.bat
    echo.
    pause
    exit /b 1
)

echo ✅ Flutter found!
echo.

cd flutter_app

echo 🎯 What would you like to do?
echo.
echo 1. Test on Web (Chrome) - Instant, no build needed
echo 2. Build for Web - Deploy to any server
echo 3. Build for Android - Test on Android devices
echo 4. Open Appetize.io in browser
echo 5. Open Codemagic in browser
echo 6. Show testing guide
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo.
    echo 🌐 Starting Flutter app on Chrome...
    echo 💡 This is the fastest way to test your app!
    echo.
    flutter run -d chrome
) else if "%choice%"=="2" (
    echo.
    echo 🌐 Building Flutter app for Web...
    flutter build web
    echo.
    echo ✅ Web app built successfully!
    echo 📁 Output: build\web\
    echo.
    echo 💡 To test locally:
    echo    python -m http.server 8080 -d build\web
    echo    Then open: http://localhost:8080
    echo.
) else if "%choice%"=="3" (
    echo.
    echo 📱 Building Flutter app for Android...
    flutter build apk
    echo.
    echo ✅ Android APK built successfully!
    echo 📁 Output: build\app\outputs\flutter-apk\app-release.apk
    echo.
    echo 💡 Install on Android device to test
    echo.
) else if "%choice%"=="4" (
    echo.
    echo 🌐 Opening Appetize.io...
    start https://appetize.io
    echo.
    echo 💡 Steps to test:
    echo    1. Sign up for free account
    echo    2. Upload your iOS .ipa file
    echo    3. Test in browser instantly!
    echo.
    echo 📖 For iOS build instructions, see:
    echo    Documentation\Free_iOS_Testing_Guide.md
    echo.
) else if "%choice%"=="5" (
    echo.
    echo 🌐 Opening Codemagic...
    start https://codemagic.io
    echo.
    echo 💡 Steps to build iOS app:
    echo    1. Push your code to GitHub
    echo    2. Connect Codemagic to your repo
    echo    3. Configure iOS build
    echo    4. Build in cloud (no Mac needed!)
    echo    5. Download .ipa file
    echo.
    echo 📖 Full guide: Documentation\Free_iOS_Testing_Guide.md
    echo.
) else if "%choice%"=="6" (
    echo.
    echo 📖 Opening testing guide...
    start Documentation\Free_iOS_Testing_Guide.md
    echo.
) else (
    echo.
    echo ❌ Invalid choice. Please run the script again.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo 💡 Quick Tips:
echo.
echo • Test on Web first (fastest): flutter run -d chrome
echo • Use Appetize.io for iOS testing (free, browser-based)
echo • Use Codemagic to build iOS apps without Mac
echo • See Documentation\Free_iOS_Testing_Guide.md for details
echo.
echo ============================================
echo.
pause

