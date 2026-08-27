#!/usr/bin/env bash
# RetroViz Studio - 1-Click Updater for macOS and Linux

echo "================================================================"
echo "          RetroViz Studio - Auto Updater (GitHub Sync)"
echo "================================================================"
echo ""

if [ ! -d ".git" ]; then
    echo "❌ [ERROR] No .git directory found!"
    echo "Please make sure you cloned this project using 'git clone <repo-url>'."
    exit 1
fi

echo "🔄 [1/2] Pulling latest code changes from GitHub..."
echo ""
git pull
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️ [WARNING] Git pull encountered an error."
    echo "Check your internet connection or git branch status."
    exit 1
fi

echo ""
echo "📦 [2/2] Updating dependencies (npm install)..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo "⚠️ [WARNING] Failed to install npm dependencies."
    exit 1
fi

echo ""
echo "================================================================"
echo "          ✅ RetroViz Studio is completely up to date!"
echo "================================================================"
echo ""

read -p "🚀 Do you want to start the application now? (y/n, default: y): " start_now
start_now=${start_now:-y}

if [[ "$start_now" =~ ^[Yy]$ ]]; then
    echo "Starting server on http://localhost:3000..."
    (sleep 2 && (open http://localhost:3000 || xdg-open http://localhost:3000)) &
    npm run dev
fi
