@echo off

echo 🧊 Building site...
node build.js

echo 📦 Adding files...
git add .

echo 📝 Committing...
git commit -m "update content"

echo 🚀 Pushing to GitHub...
git push

echo ✅ Published!
pause