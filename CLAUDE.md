# CLAUDE.md - Guidelines for Claude Code

## Project Overview
RetroViz Studio is an audio visualizer and VJ video production studio built with React 19, TypeScript, Tailwind CSS v4, Three.js, Butterchurn (Milkdrop 2), and Web Audio API.

## Priority Directive
The user has reported UI flickering ("ממשק UI שמרצד"). Follow the technical diagnostic and architectural instructions detailed in `PROJECT_HANDOFF.md`.

### Key Tasks:
1. Stop root `<App />` component from re-rendering on every audio analysis frame (isolate `beatState`, `bands`, `fps`, `currentTime` out of root state).
2. Remove any layout CSS transitions (`transition-all`) from canvas wrappers.
3. Keep WebGL contexts stable and avoid resizing canvas elements during animation loops.
4. Verify with `npm run lint` and `npm run build`.
5. Commit and push changes to GitHub (`git push origin main`) so the cloud agent in AI Studio can sync with the updates.
