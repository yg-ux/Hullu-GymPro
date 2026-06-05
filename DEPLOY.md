# Deploying GymPro to Vercel (Free)

## Prerequisites
1. A [GitHub](https://github.com) account
2. A [Vercel](https://vercel.com) account (free tier)

## Steps

### 1. Push to GitHub
```bash
cd D:\Hullu Ceramics\Gym
git init
git add .
git commit -m "Initial GymPro setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gympro.git
git push -u origin main
```

### 2. Deploy Backend First (Railway - Free Tier)
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your gympro repo
5. Set root directory to `server`
6. Railway will auto-detect Node.js
7. Add environment variable: `PORT=3000`
8. Click Deploy

After deploy, you'll get a URL like: `https://gympro-server.up.railway.app`

### 3. Deploy Frontend to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New" → "Project"
4. Import your gympro repo
5. Set root directory to `client`
6. Under "Environment Variables", add:
   - Name: `VITE_API_URL`
   - Value: `https://your-railway-url.up.railway.app`
7. Click "Deploy"

### 4. Done!
Your app will be live at: `https://your-project.vercel.app`

## Important Notes

- **Backend runs separately** - Vercel only hosts the frontend (React)
- **SQLite database** - Currently stored locally on the Railway server. Each gym's data is in their own table (multi-tenant), so it's secure
- **For production** - Consider migrating to PostgreSQL for better scalability

## Troubleshooting

If you see API errors after deployment:
1. Check browser console for exact error
2. Verify VITE_API_URL is set correctly in Vercel
3. Make sure Railway backend is running

## Updating

After code changes:
```bash
git add .
git commit -m "Your changes"
git push
```
Vercel/Railway will auto-redeploy.