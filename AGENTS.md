# AGENTS.md - Instructions for Autonomous Coding Agents (Codex / Claude / Cursor / Antigravity)

Welcome! This is **RetroViz Studio**, an advanced real-time music visualization and video production studio.

## 🎯 Current Mission & Urgent Task:
1. **Fix UI Flickering ("ממשק UI שמרצד")**:
   - The user reported that the interface exhibits visual flickering/jitter upon opening and running.
   - **Root Cause**: Top-level React state thrashing (`setBeatState`, `setBands`, `setLiveFps`, `setRenderTimeMs`, `setCurrentTime`) triggers 20-60 re-renders per second of the massive 2,800-line `App.tsx` component, combined with CSS transitions on canvas parent wrappers.
   - **Action**: Read `PROJECT_HANDOFF.md` section 5 for the detailed diagnostic and step-by-step refactor plan to isolate high-frequency telemetry into memoized leaf components or direct DOM/ref updates.
2. **Push Changes to GitHub**:
   - After completing edits, run `npm run lint` and `npm run build`.
   - Then run:
     ```bash
     git add .
     git commit -m "Fix UI flickering and isolate animation telemetry"
     git push origin main
     ```
   - This allows the AI Studio cloud agent to sync and view the latest updates.

## 📖 Deep Technical Documentation:
Refer to `PROJECT_HANDOFF.md` in the root directory for the complete architecture, WebGL/Three.js engines, Butterchurn Milkdrop setup, audio DSP pipeline, and export workflows.
