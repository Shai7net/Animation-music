# 🚀 RetroViz Studio - Comprehensive Project Handoff & Architecture Guide
> **Target Audience**: AI Coding Agents (Codex, Claude Code, Cursor, GitHub Copilot) & Human Engineers.  
> **Project Version**: `v1.2.0`  
> **Runtime Target**: Node 20+, React 19, TypeScript, Vite 6, Tailwind CSS v4, WebGL / Three.js, Web Audio API.

---

## 📌 1. Executive Summary & Purpose

**RetroViz Studio** is a high-performance, studio-grade real-time audio visualization suite and video compositor. It allows musicians, VJs, creators, and streamers to generate reactive visuals from audio files or live microphone feeds.

### Key Capabilities:
1. **Three.js 3D Worlds**: 6 procedurally rendered reactive 3D environments with interactive camera orbital control (Cyber City, Synthwave Horizon, Hyperdrive Tunnel, Ferrofluid Liquid Blob, Cosmic Particle Galaxy, Monolith Arena).
2. **Winamp Milkdrop 2 (Butterchurn WebGL)**: Full port of classic Winamp audio visualizer presets with seamless blending.
3. **Retro 2D & Character Engines**: Audio-reactive dancing characters with transparent background removal, disco floors, spectrum analyzers, vector oscilloscopes, and circular HUDs.
4. **3D Spatial Dual-Layer Engine**: Real-time compositing of two simultaneous visualizer layers with 3D transforms (depth, rotation, scale, mirror, beat pulse).
5. **Video Remix Overlay**: Live video background playback with audio-reactive blend modes.
6. **Pro VJ Export & Matte Pass**: Real-time and offline video export (720p/1080p/4K, 12/24/30/60 FPS, WebM/MP4) including a pure Black & White Luma Matte pass for Resolume, TouchDesigner, and Premiere Pro.

---

## 🛠️ 2. Tech Stack & Key Libraries

| Component | Technology | Role |
|---|---|---|
| **Framework** | **React 19** + **TypeScript** | Strict type safety, functional architecture, custom hooks |
| **Bundler / Server** | **Vite 6** | Port 3000 host, HMR support |
| **Styling** | **Tailwind CSS v4** | Modern CSS theme engine via `@import "tailwindcss";` |
| **3D Graphics** | **Three.js** (`r160+`) | Custom shaders, particle systems, meshes, camera rigs |
| **Milkdrop WebGL** | **Butterchurn** + **Butterchurn-Presets** | Winamp visualization emulation |
| **Audio DSP** | **Web Audio API** (`AudioContext`) | FFT analysis (2048 points), multi-band splitting, beat & drop detection |
| **Icons** | **Lucide React** | Consistent SVG iconography |
| **Error Shield** | **ErrorBoundary** (`src/components/ErrorBoundary.tsx`) | Catch-all recovery UI preventing blank screens on WebGL/Audio errors |
| **WebGL Polyfill** | `src/utils/webglPolyfill.ts` | Safety shim preventing `null` precision errors in virtualized/iframe browsers |

---

## 📂 3. Directory Structure & Key Files

```
├── .env.example               # Environment definitions
├── index.html                 # Main HTML entry with canvas viewport
├── metadata.json              # App manifest & permissions
├── package.json               # Dependencies & scripts
├── start.bat / start.sh       # 1-click startup scripts (Windows & Mac/Linux)
├── update.bat / update.sh     # 1-click git pull & auto-update scripts
├── vite.config.ts             # Vite configuration
└── src/
    ├── main.tsx               # Bootstrapping with WebGL polyfill & ErrorBoundary
    ├── App.tsx                # Main monolithic studio orchestrator (~2800 lines)
    ├── index.css              # Global styling & Tailwind directives
    ├── audioEngine.ts         # DSP engine, frequency analysis, beat/drop detection
    ├── threeVisualizer.ts     # 6 Three.js reactive 3D scenes & lifecycle managers
    ├── butterchurnVisualizer.ts # Milkdrop 2 engine wrapper & preset switcher
    ├── canvasVisualizers.ts   # 2D canvas drawing routines (Dancing Man, HUD, Bars)
    ├── i18n.ts                # Dual-language support (English & Hebrew)
    ├── types.ts               # Shared interfaces (AudioBands, BeatState, VisualizerItem)
    ├── utils/
    │   └── webglPolyfill.ts   # WebGL getShaderPrecisionFormat shim
    └── components/
        └── ErrorBoundary.tsx  # React error boundary & system recovery UI
```

---

## 🔬 4. Core Subsystem Breakdown

### 4.1 Audio Engine & DSP Pipeline (`src/audioEngine.ts`)
- **AnalyserNode Configuration**: `fftSize = 2048`, `smoothingTimeConstant = 0.8` (configurable).
- **Frequency Bands**:
  - `subBass` (20–60 Hz)
  - `bass` (60–250 Hz)
  - `lowMid` (250–500 Hz)
  - `mid` (500–2000 Hz)
  - `highMid` (2000–4000 Hz)
  - `treble` (4000–8000 Hz)
  - `brilliance` (8000–20000 Hz)
- **Beat & Drop Detection**:
  - Computes instantaneous energy against rolling average.
  - Generates `isBeat`, `beatIntensity`, `bpm`, `isDrop`, and VU level in dBFS.
- **Audio FX Chain**: BiquadFilter (Low/High Pass), Gain (Master Volume), Stereo Panner.

### 4.2 Three.js 3D Visualizers (`src/threeVisualizer.ts`)
- Every scene implements the `ThreeSceneInstance` interface:
  ```ts
  export interface ThreeSceneInstance {
    update: (freq: Uint8Array, timeData: Uint8Array, time: number, intensity: number) => void;
    resize: (w: number, h: number) => void;
    destroy: () => void;
    handlePointerDown: (e: MouseEvent | TouchEvent) => void;
    handlePointerMove: (e: MouseEvent | TouchEvent) => void;
    handlePointerUp: () => void;
    handleWheel: (e: WheelEvent) => void;
  }
  ```
- Uses `initSceneRenderer(canvas)` which protects against shader precision format crashes in virtualized WebGL contexts.

### 4.3 Milkdrop / Butterchurn (`src/butterchurnVisualizer.ts`)
- Emulates Nullsoft Winamp Milkdrop 2 visual presets inside a dedicated WebGL context.
- Requires an active `AudioNode` connected via `butterchurn.connectAudio(sourceNode)`.

---

## ⚡ 5. THE UI FLICKERING / JITTER PROBLEM ("UI שמרצד")

### 🔍 Root Cause Analysis:
1. **Root Component State Thrashing**:
   - `src/App.tsx` contains the entire studio interface in a single large component.
   - The animation loop (`requestAnimationFrame(loop)`) updates state variables (`setBeatState`, `setBands`, `setLiveFps`, `setRenderTimeMs`, `setCurrentTime`) directly in `App`.
   - Even though throttled to 50ms (20 FPS), triggering `setState` at the root causes React 19 to re-render all **2,800 lines of JSX** (including buttons, sliders, inspector tabs, and canvas containers) 20 times per second.
2. **CSS Transition Conflicts**:
   - The stage viewport and canvas parent elements historically included `transition-all duration-300`.
   - When React re-renders with slight changes in properties or dimensions, `transition-all` triggers a continuous CSS animation on layout properties (width, height, transform, filter).
   - This causes visible micro-jitter, sub-pixel shifting, and canvas buffer invalidation.
3. **Canvas Element Resizing during Render**:
   - If canvas elements re-read container dimensions (`getBoundingClientRect()`) during an ongoing CSS transition, the canvas width/height gets mutated mid-frame, causing WebGL to clear the screen and flicker black for 1 frame.

### 🎯 Instructions for Local Codex / Claude Agent to Fix the UI Flickering:
1. **Isolate Real-Time Telemetry from Root State**:
   - Move real-time HUD elements (VU Meter, Beat Indicator, BPM readout, FPS badge) into dedicated sub-components (`<TelemetryHUD />`, `<BeatIndicator />`).
   - Use direct ref updating or a lightweight event/subscription callback (e.g. `onFrame((dsp) => ...)` or a mini pub/sub store) so the parent `<App />` **does NOT re-render on every animation frame**.
2. **Strip `transition-all` from Canvas Containers**:
   - Ensure `<div className="stage-container">` and `<canvas>` elements have NO layout transitions (`transition-all`, `transition-transform`). Keep canvas layout strictly static and rigid (`w-full h-full object-contain`).
3. **Memoize Heavy Control Panels**:
   - Wrap `<VisualizerPicker />`, `<AudioFxDrawer />`, `<DualLayerInspector />`, and `<ExportModal />` in `React.memo` so they remain completely static while audio is playing.

---

## 🔄 6. GitHub Synchronization Protocol (Crucial!)

To ensure smooth collaboration between the local AI agent on the user's computer and the Google AI Studio cloud agent:

### 📥 Step 1: After Making Local Edits
Whenever the local agent (Codex / Claude) completes a code modification:
1. Run linter and build to ensure zero errors:
   ```bash
   npm run lint
   npm run build
   ```
2. Commit and push the changes directly to GitHub:
   ```bash
   git add .
   git commit -m "Optimize render loop: decouple telemetry state and eliminate UI flicker"
   git push origin main
   ```

### 📤 Step 2: Informing the Cloud Agent
When the user returns to the AI Studio chat, they can simply say:
> *"עדכנתי את הפרויקט ב-GitHub, תמשוך ותמשיך משם"* / *"I updated the repo on GitHub, pull the changes"*.

The cloud agent will then inspect the updated files and continue seamlessly.

---

## 🚀 7. Commands Reference

- **Start Dev Server**: `npm run dev` (running on `http://localhost:3000`)
- **Run TypeScript Check**: `npm run lint` (`tsc --noEmit`)
- **Build Production Bundle**: `npm run build`
- **1-Click Windows Launch**: Double-click `start.bat`
- **1-Click Windows Update**: Double-click `update.bat`
- **1-Click Mac/Linux Launch**: `./start.sh`
- **1-Click Mac/Linux Update**: `./update.sh`
