# CODEX.md - Instructions for OpenAI Codex

## Mission: RetroViz Studio UI Flickering Resolution
Fix the UI flickering issue reported by the user when running the application.

### Reference:
Read `PROJECT_HANDOFF.md` for the comprehensive technical breakdown.

### Critical Instructions:
1. Prevent high-frequency animation loop state thrashing in `src/App.tsx`.
2. Decouple audio telemetry (VU meter, BPM, Beat pulses, FPS) from root React state.
3. Eliminate CSS layout transition classes on `<canvas>` parents.
4. Verify using:
   - `npm run lint`
   - `npm run build`
5. **Git Sync**:
   After testing, commit and push changes:
   ```bash
   git add .
   git commit -m "Resolve UI flickering and decouple render loop telemetry"
   git push origin main
   ```
   This ensures the cloud AI Studio agent can receive and continue from your latest code.
