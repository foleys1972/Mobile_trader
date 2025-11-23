# Railway Deployment Instructions

## Manual Railway Deployment

Since CLI authentication is having issues, here's how to deploy manually:

### Step 1: Go to Railway Dashboard
1. Visit [railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub
1. Select "Deploy from GitHub repo"
2. Connect your GitHub account
3. Select this repository: `Mobile_trader`

### Step 3: Configure Deployment
1. Railway will auto-detect Python
2. Set these environment variables:
   - `PORT=8000`
   - `PYTHONPATH=/app/Backend/API`

### Step 4: Deploy
1. Railway will automatically:
   - Install dependencies from `Backend/API/requirements.txt`
   - Run `python main.py`
   - Expose the API on a public URL

### Step 5: Get Your API URL
1. After deployment, Railway will provide a URL like:
   - `https://your-project-name.railway.app`
2. Test with: `https://your-project-name.railway.app/health`

## Alternative: Replit Deployment

### Step 1: Go to Replit
1. Visit [replit.com](https://replit.com)
2. Create new Python repl
3. Upload the `Backend/API/` folder contents

### Step 2: Configure
1. Set environment variables:
   - `PORT=8000`
2. Run: `python main.py`

### Step 3: Deploy
1. Click "Run" button
2. Replit will provide a public URL

## Testing Your Deployment

Once deployed, test these endpoints:
- `GET /health` - Health check
- `GET /` - API info
- `POST /banks/{bank_id}/configure` - Configure bank
- `GET /banks/{bank_id}/lines` - Get trading lines

## Next Steps

After backend deployment:
1. Update iOS app API endpoints
2. Deploy Flutter web app
3. Test complete system

