#!/usr/bin/env bash
# RetroViz Studio - Launch Script for macOS and Linux

echo "================================================================"
echo "                   Launching RetroViz Studio"
echo "================================================================"
echo "Opening browser at http://localhost:3000 ..."

(sleep 2 && (open http://localhost:3000 || xdg-open http://localhost:3000)) &
npm run dev
