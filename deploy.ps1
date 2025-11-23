# Direct Trader Communications - Deployment Script
# This script deploys the backend API to Railway

Write-Host "Starting Direct Trader Communications Deployment..." -ForegroundColor Green

# Check if Railway CLI is working
Write-Host "Checking Railway CLI..." -ForegroundColor Yellow
try {
    railway --version
    Write-Host "Railway CLI is available" -ForegroundColor Green
} catch {
    Write-Host "Railway CLI not working, trying alternative deployment..." -ForegroundColor Red
    exit 1
}

# Navigate to project root
Set-Location "C:\Projects\Mobile_trader"

# Initialize Railway project
Write-Host "Initializing Railway project..." -ForegroundColor Yellow
railway init

# Deploy the backend
Write-Host "Deploying backend API..." -ForegroundColor Yellow
railway up

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Your API will be available at the Railway URL" -ForegroundColor Cyan

