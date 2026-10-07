#!/data/data/com.termux/files/usr/bin/bash
set -e
# Usage (from the project folder): bash push-to-github-termux.sh
cd "$(dirname "$0")"
[ -d .git ] || { echo "❌ এটা git repo নয়। আগে: git init && git remote add origin <REPO_URL>"; exit 1; }
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)
git add -A
if git diff --cached --quiet; then
  echo "কোনো নতুন পরিবর্তন নেই।"
else
  git commit -m "Update SANJU app v3.3.1"
fi
git push -u origin "$BRANCH"
