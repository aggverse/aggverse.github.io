@echo off

echo 🧊 Building site...
node build.js

echo 📦 Adding files...
git add .

echo 📝 Committing...
git commit -m "update content"

echo 🔄 Pulling from GitHub (handling first-time sync)...
git pull origin main --allow-unrelated-histories

echo 🚀 Pushing to GitHub...
git push -u origin main

echo ✅ Published!
pause