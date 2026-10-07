#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "=================================================="
echo "⚡ Sanju AI Assistant - Auto Setup & Sync Tool"
echo "=================================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "⚠️ Git is not installed! Installing git..."
    pkg install git -y || apt-get install git -y
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "⚠️ Curl is not installed! Installing curl..."
    pkg install curl -y || apt-get install curl -y
fi

# Check if unzip is installed
if ! command -v unzip &> /dev/null; then
    echo "⚠️ Unzip is not installed! Installing unzip..."
    pkg install unzip -y || apt-get install unzip -y
fi

cd ~
echo "1️⃣ Downloading fresh sanju-app package..."
rm -f sanju-app.zip
curl -f -L --progress-bar -o sanju-app.zip "https://ais-dev-5f4gp7djvladecoajf56hn-838398288575.asia-southeast1.run.app/api/download-zip"

echo "2️⃣ Verifying archive..."
if ! unzip -t sanju-app.zip > /dev/null 2>&1; then
    echo "❌ Downloaded zip file corrupted or incomplete. Please check your internet connection."
    exit 1
fi

echo "3️⃣ Extracting files..."
rm -rf temp-extract
mkdir -p temp-extract
unzip -q -o sanju-app.zip -d temp-extract

echo "4️⃣ Updating project directory..."
mkdir -p ~/sanju-app
cp -rf temp-extract/sanju-app/. ~/sanju-app/
rm -rf temp-extract sanju-app.zip

echo "5️⃣ Preparing Git push..."
cd ~/sanju-app

# If not a git repo, prompt
if [ ! -d .git ]; then
    echo "⚠️ Git repository not initialized in ~/sanju-app."
    echo "Run: cd ~/sanju-app && git init && git remote add origin YOUR_REPO_URL"
    exit 1
fi

git add -A
STATUS=$(git status --porcelain)

if [ -z "$STATUS" ]; then
    echo "✅ Already up-to-date! No new changes to commit."
else
    echo "📝 Committing changes..."
    git commit -m "🚀 Sanju App Update: Native Voice, Auto-Dialer, Offline Vault & GitHub Release v1.0"
    echo "🚀 Pushing to GitHub..."
    git push
    echo "=================================================="
    echo "🎉 SUCCESS! Your code has been pushed to GitHub."
    echo "📱 GitHub Actions is now automatically building your Android APK!"
    echo "Check your GitHub Repository -> 'Actions' tab or 'Releases' tab."
    echo "=================================================="
fi
