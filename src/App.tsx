import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Upload, Settings, Monitor, Film, Download, FileAudio, 
  Sparkles, Compass, RotateCcw, RotateCw, Shuffle, ChevronRight, ChevronLeft, Box,
  Layers, Volume2, Maximize2, Repeat, Sliders, Palette, Zap, Radio,
  Activity, HelpCircle, X, Contrast, GitBranch, FolderArchive, Image as ImageIcon, FileArchive,
  Video as VideoIcon, Rewind, FastForward, SkipBack, SkipForward, SlidersHorizontal, CheckCircle2, Cpu,
  RefreshCw
} from 'lucide-react';
import JSZip from 'jszip';
import { i18n, Language } from './i18n';
import { visualizers } from './visualizers';
import { 
  createCyberDiveScene, 
  createGalaxyParticleScene, 
  createMonolithArenaScene, 
  createSynthwaveHorizonScene,
  createHyperdriveTunnelScene,
  createLiquidBlobScene,
  ThreeSceneInstance 
} from './threeVisualizer';
import { createButterchurnVisualizer, ButterchurnInstance } from './butterchurnVisualizer';
import { WaveformPlayer } from './components/WaveformPlayer';
import { AudioEngine, generateProceduralAudioBlob, BeatState, AudioBands } from './audioEngine';
import { AudioFXPanel } from './components/AudioFXPanel';
import { VJModeHUD } from './components/VJModeHUD';
import { SpatialLayerControls, LayerTransform, defaultLayerTransform } from './components/SpatialLayerControls';
import { GitHubUpdateModal } from './components/GitHubUpdateModal';
import { VideoRemixPanel, VideoRemixSettings } from './components/VideoRemixPanel';
import { generateProceduralDemoVideoBlob } from './videoDemoGenerator';

export type CategoryFilter = 'all' | 'video' | 'three' | 'butterchurn' | '2d';

interface UnifiedVisualizer {
  id: string;
  nameEn: string;
  nameHe: string;
  engine: '2d' | 'three' | 'butterchurn' | 'video';
  threeType?: 'cyber_city' | 'galaxy' | 'monolith' | 'synthwave_horizon' | 'hyperdrive_tunnel' | 'liquid_blob';
  badge?: string;
}

const videoVisualizer: UnifiedVisualizer = {
  id: 'video_speed_remix',
  nameEn: 'Audio-Reactive Video Remix',
  nameHe: 'רמיקס וידאו לפי מהירות האודיו',
  engine: 'video',
  badge: 'Video Speed'
};

const threeVisualizers: UnifiedVisualizer[] = [
  { id: '3d_three_cyber_city', nameEn: '3D: Cyber City Flight', nameHe: 'תלת-ממד: טיסת סייבר ועיר', engine: 'three', threeType: 'cyber_city', badge: 'Three.js' },
  { id: '3d_three_synthwave_horizon', nameEn: '3D: Synthwave Neon Grid & Sun', nameHe: 'תלת-ממד: כביש סינת\'ווייב ושמש', engine: 'three', threeType: 'synthwave_horizon', badge: 'Three.js' },
  { id: '3d_three_hyperdrive_tunnel', nameEn: '3D: Quantum Warp Tunnel', nameHe: 'תלת-ממד: מנהרת קוונטום ומהירות אור', engine: 'three', threeType: 'hyperdrive_tunnel', badge: 'Three.js' },
  { id: '3d_three_liquid_blob', nameEn: '3D: Liquid Ferrofluid Blob', nameHe: 'תלת-ממד: ספירת נוזל מגנטי זוהר', engine: 'three', threeType: 'liquid_blob', badge: 'Three.js' },
  { id: '3d_three_galaxy_nebula', nameEn: '3D: Cosmic Particle Nebula', nameHe: 'תלת-ממד: ערפילית חלקיקים', engine: 'three', threeType: 'galaxy', badge: 'Three.js' },
  { id: '3d_three_monolith_arena', nameEn: '3D: Chrome Monolith Arena', nameHe: 'תלת-ממד: ארנת עמודי כרום', engine: 'three', threeType: 'monolith', badge: 'Three.js' },
];

const butterchurnVisualizer: UnifiedVisualizer = {
  id: 'butterchurn_milkdrop',
  nameEn: 'Winamp Milkdrop 2 (WebGL)',
  nameHe: 'ווינאמפ מילקדרופ 2 (Butterchurn)',
  engine: 'butterchurn',
  badge: 'Milkdrop'
};

const allUnifiedVisualizers: UnifiedVisualizer[] = [
  videoVisualizer,
  ...threeVisualizers,
  butterchurnVisualizer,
  ...visualizers.map(v => ({
    id: v.id,
    nameEn: v.nameEn,
    nameHe: v.nameHe,
    engine: '2d' as const,
    badge: v.id === 'dancing_man' ? 'Character' : undefined
  }))
];

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeStyleId, setActiveStyleId] = useState<string>(threeVisualizers[0].id);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [activeSidebarTab, setActiveSidebarTab] = useState<'styles' | 'video' | 'dual' | 'fx'>('styles');
  
  // Video Remix & Speed Modulation States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentVideoSpeed, setCurrentVideoSpeed] = useState<number>(1.0);
  const [isLoadingDemoVideo, setIsLoadingDemoVideo] = useState<boolean>(false);
  const [videoRemixSettings, setVideoRemixSettings] = useState<VideoRemixSettings>({
    speedSensitivity: 1.4,
    minSpeed: 0.2,
    maxSpeed: 3.5,
    invertReactivity: false,
    freqDriver: 'bass',
    smoothing: 0.35,
    endBehavior: 'cut_at_video',
    videoFit: 'cover',
    strobeOnDrop: true
  });

  // Dual Layer & 3D Spatial Composer States
  const [isDualLayerEnabled, setIsDualLayerEnabled] = useState<boolean>(false);
  const [layer1Id, setLayer1Id] = useState<string>(threeVisualizers[1]?.id || threeVisualizers[0].id); // 3D Synthwave Horizon
  const [layer2Id, setLayer2Id] = useState<string>('dancing_man'); // Character: Dancing Man
  const [layer1Intensity, setLayer1Intensity] = useState<number>(1.0); // Independent sensitivity for Layer 1
  const [layer2Intensity, setLayer2Intensity] = useState<number>(1.2); // Independent sensitivity for Layer 2
  const [layerTransform, setLayerTransform] = useState<LayerTransform>(defaultLayerTransform);

  // Milkdrop Preset states
  const [currentPresetName, setCurrentPresetName] = useState<string>('');
  const [presetList, setPresetList] = useState<string[]>([]);

  // DSP & Audio FX States
  const [bassBoost, setBassBoost] = useState<number>(0);
  const [djFilter, setDjFilter] = useState<number>(0);
  const [activePalette, setActivePalette] = useState<string>('cyber_neon');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [crtEffect, setCrtEffect] = useState<boolean>(false);
  const [bloomEffect, setBloomEffect] = useState<boolean>(true);
  const [glitchOnDrop, setGlitchOnDrop] = useState<boolean>(true);

  // Fullscreen & Shortcuts Modal
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [showGitHubModal, setShowGitHubModal] = useState<boolean>(false);
  const [hasNewGitHubUpdate, setHasNewGitHubUpdate] = useState<boolean>(false);
  const [latestCommitInfo, setLatestCommitInfo] = useState<any>(null);
  const [showUpdateToast, setShowUpdateToast] = useState<boolean>(false);

  // Export Settings (Standard Video Save vs. Advanced Formats)
  const [exportTab, setExportTab] = useState<'standard' | 'advanced'>('standard');
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [exportAr, setExportAr] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [exportFps, setExportFps] = useState<number>(30);
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('webm');
  const [exportPassMode, setExportPassMode] = useState<'color' | 'bw_matte' | 'both'>('color');
  const [exportTarget, setExportTarget] = useState<'video' | 'frames' | 'both'>('video');
  const [framesFormat, setFramesFormat] = useState<'png' | 'jpeg'>('png');
  const [capturedFramesCount, setCapturedFramesCount] = useState<number>(0);
  const [isCompressingZip, setIsCompressingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [previewBW, setPreviewBW] = useState<boolean>(false);
  const [hideStageBackground, setHideStageBackground] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [intensity, setIntensity] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(true);

  // Performance Engine & Workstation Telemetry Profile
  const [performanceProfile, setPerformanceProfile] = useState<'workstation' | 'balanced' | 'eco'>('balanced');
  const [showPerfMenu, setShowPerfMenu] = useState<boolean>(false);
  const [liveFps, setLiveFps] = useState<number>(60);
  const [renderTimeMs, setRenderTimeMs] = useState<number>(1.2);
  const performanceProfileRef = useRef(performanceProfile);
  const lastFpsTimestampRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  useEffect(() => { performanceProfileRef.current = performanceProfile; }, [performanceProfile]);

  // Live DSP Beat & Band State for UI
  const [beatState, setBeatState] = useState<BeatState>({
    isBeat: false,
    isDrop: false,
    beatIntensity: 0,
    bpm: 128,
    vuLevel: 0,
    currentDb: -90
  });
  const [bands, setBands] = useState<AudioBands>({
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    overallEnergy: 0,
    rmsDb: -90,
    peakDb: -90,
    gatedEnergy: 0,
    isSilent: true,
    perceivedLoudness: 0
  });

  const t = i18n[lang];

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Canvases & Container
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const canvasThreeRef = useRef<HTMLCanvasElement>(null);
  const canvasButterchurnRef = useRef<HTMLCanvasElement>(null);
  const canvasOverlay2DRef = useRef<HTMLCanvasElement>(null);
  const canvasExportCompositeRef = useRef<HTMLCanvasElement>(null);
  const canvasExportBWRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Instances
  const threeInstanceRef = useRef<ThreeSceneInstance | null>(null);
  const butterchurnInstanceRef = useRef<ButterchurnInstance | null>(null);
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());

  const reqRef = useRef<number | null>(null);
  const mediaRecorderColorRef = useRef<MediaRecorder | null>(null);
  const mediaRecorderBWRef = useRef<MediaRecorder | null>(null);

  // Frame Sequence Refs
  const framesListRef = useRef<{ path: string; blob: Blob }[]>([]);
  const nextFrameCaptureTimeRef = useRef<number>(0);
  const frameSequenceIndexRef = useRef<number>(1);
  const exportTargetRef = useRef(exportTarget);
  const framesFormatRef = useRef(framesFormat);
  const exportFpsRef = useRef(exportFps);
  const exportResRef = useRef(exportRes);
  const exportArRef = useRef(exportAr);

  const activeStyleIdRef = useRef(activeStyleId);
  const isDualLayerEnabledRef = useRef(isDualLayerEnabled);
  const layer1IdRef = useRef(layer1Id);
  const layer2IdRef = useRef(layer2Id);
  const layer1IntensityRef = useRef(layer1Intensity);
  const layer2IntensityRef = useRef(layer2Intensity);
  const layerTransformRef = useRef(layerTransform);
  const isExportingRef = useRef(isExporting);
  const isPlayingRef = useRef(isPlaying);
  const intensityRef = useRef(intensity);
  const isLoopingRef = useRef(isLooping);
  const exportPassModeRef = useRef(exportPassMode);
  const previewBWRef = useRef(previewBW);
  const hideStageBackgroundRef = useRef(hideStageBackground);
  const videoRemixSettingsRef = useRef(videoRemixSettings);
  const videoUrlRef = useRef(videoUrl);
  const smoothedVideoSpeedRef = useRef<number>(1.0);
  const lastSpeedUpdateUIRef = useRef<number>(0);

  // Performance & Zero-Garbage Memory Optimization Buffers (Prevents GC pauses & UI stutter)
  const scaledFreq1Ref = useRef<Uint8Array | null>(null);
  const scaledTime1Ref = useRef<Uint8Array | null>(null);
  const scaledFreq2Ref = useRef<Uint8Array | null>(null);
  const scaledTime2Ref = useRef<Uint8Array | null>(null);
  const lastUiUpdateRef = useRef<number>(0);

  useEffect(() => { activeStyleIdRef.current = activeStyleId; }, [activeStyleId]);
  useEffect(() => { isDualLayerEnabledRef.current = isDualLayerEnabled; }, [isDualLayerEnabled]);
  useEffect(() => { layer1IdRef.current = layer1Id; }, [layer1Id]);
  useEffect(() => { layer2IdRef.current = layer2Id; }, [layer2Id]);
  useEffect(() => { layer1IntensityRef.current = layer1Intensity; }, [layer1Intensity]);
  useEffect(() => { layer2IntensityRef.current = layer2Intensity; }, [layer2Intensity]);
  useEffect(() => { layerTransformRef.current = layerTransform; }, [layerTransform]);
  useEffect(() => { isExportingRef.current = isExporting; }, [isExporting]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);
  useEffect(() => { exportPassModeRef.current = exportPassMode; }, [exportPassMode]);
  useEffect(() => { previewBWRef.current = previewBW; }, [previewBW]);
  useEffect(() => { hideStageBackgroundRef.current = hideStageBackground; }, [hideStageBackground]);
  useEffect(() => { exportTargetRef.current = exportTarget; }, [exportTarget]);
  useEffect(() => { framesFormatRef.current = framesFormat; }, [framesFormat]);
  useEffect(() => { exportFpsRef.current = exportFps; }, [exportFps]);
  useEffect(() => { exportResRef.current = exportRes; }, [exportRes]);
  useEffect(() => { exportArRef.current = exportAr; }, [exportAr]);
  useEffect(() => { videoRemixSettingsRef.current = videoRemixSettings; }, [videoRemixSettings]);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);

  const effectiveBaseItem = isDualLayerEnabled
    ? (allUnifiedVisualizers.find(v => v.id === layer1Id) || allUnifiedVisualizers[0])
    : (allUnifiedVisualizers.find(v => v.id === activeStyleId) || allUnifiedVisualizers[0]);

  const activeItem = effectiveBaseItem;

  // Helper to resize all canvases
  const updateCanvasSizes = useCallback(() => {
    let baseH = 720;
    if (isExportingRef.current) {
      if (exportResRef.current === '1080p') baseH = 1080;
      if (exportResRef.current === '4k') baseH = 2160;
    } else {
      if (performanceProfileRef.current === 'workstation') baseH = 1080;
      else if (performanceProfileRef.current === 'balanced') baseH = 720;
      else if (performanceProfileRef.current === 'eco') baseH = 540;
    }
    
    let w = 1280;
    let h = baseH;
    const ar = exportArRef.current;
    
    if (ar === '16:9') { w = Math.round(baseH * 16/9); h = baseH; }
    else if (ar === '9:16') { w = Math.round(baseH * 9/16); h = baseH; }
    else if (ar === '1:1') { w = baseH; h = baseH; }
    
    [
      canvas2DRef.current, 
      canvasThreeRef.current, 
      canvasButterchurnRef.current,
      canvasOverlay2DRef.current,
      canvasExportCompositeRef.current,
      canvasExportBWRef.current
    ].forEach(c => {
      if (c && (c.width !== w || c.height !== h)) {
        c.width = w;
        c.height = h;
      }
    });

    if (threeInstanceRef.current) {
      threeInstanceRef.current.resize(w, h);
    }
    if (butterchurnInstanceRef.current) {
      butterchurnInstanceRef.current.setRendererSize(w, h);
    }
  }, [performanceProfile, exportRes, exportAr]);

  useEffect(() => {
    if (!isExporting) {
      updateCanvasSizes();
    }
  }, [updateCanvasSizes, isExporting]);

  // WebGL Context Loss Resilience & Auto-Recovery
  useEffect(() => {
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context temporarily suspended or lost.');
    };
    const handleContextRestored = () => {
      console.log('WebGL context successfully restored.');
      updateCanvasSizes();
    };

    const c3 = canvasThreeRef.current;
    const cb = canvasButterchurnRef.current;
    if (c3) {
      c3.addEventListener('webglcontextlost', handleContextLost, false);
      c3.addEventListener('webglcontextrestored', handleContextRestored, false);
    }
    if (cb) {
      cb.addEventListener('webglcontextlost', handleContextLost, false);
      cb.addEventListener('webglcontextrestored', handleContextRestored, false);
    }

    return () => {
      if (c3) {
        c3.removeEventListener('webglcontextlost', handleContextLost);
        c3.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      if (cb) {
        cb.removeEventListener('webglcontextlost', handleContextLost);
        cb.removeEventListener('webglcontextrestored', handleContextRestored);
      }
    };
  }, []);

  // Audio FX adjustments
  useEffect(() => {
    audioEngineRef.current.setBassBoost(bassBoost);
  }, [bassBoost]);

  useEffect(() => {
    audioEngineRef.current.setDJFilter(djFilter);
  }, [djFilter]);

  // Init Three Scene when switching Three.js style
  useEffect(() => {
    const currentBase = isDualLayerEnabled
      ? (allUnifiedVisualizers.find(v => v.id === layer1Id) || allUnifiedVisualizers[0])
      : (allUnifiedVisualizers.find(v => v.id === activeStyleId) || allUnifiedVisualizers[0]);

    if (currentBase.engine === 'three' && canvasThreeRef.current) {
      if (threeInstanceRef.current) {
        try {
          threeInstanceRef.current.destroy();
        } catch (e) {}
        threeInstanceRef.current = null;
      }

      updateCanvasSizes();

      try {
        if (currentBase.threeType === 'cyber_city') {
          threeInstanceRef.current = createCyberDiveScene(canvasThreeRef.current);
        } else if (currentBase.threeType === 'synthwave_horizon') {
          threeInstanceRef.current = createSynthwaveHorizonScene(canvasThreeRef.current);
        } else if (currentBase.threeType === 'hyperdrive_tunnel') {
          threeInstanceRef.current = createHyperdriveTunnelScene(canvasThreeRef.current);
        } else if (currentBase.threeType === 'liquid_blob') {
          threeInstanceRef.current = createLiquidBlobScene(canvasThreeRef.current);
        } else if (currentBase.threeType === 'galaxy') {
          threeInstanceRef.current = createGalaxyParticleScene(canvasThreeRef.current);
        } else if (currentBase.threeType === 'monolith') {
          threeInstanceRef.current = createMonolithArenaScene(canvasThreeRef.current);
        }
      } catch (err) {
        console.error('Three.js scene creation error:', err);
      }
    } else {
      if (threeInstanceRef.current) {
        try {
          threeInstanceRef.current.destroy();
        } catch (e) {}
        threeInstanceRef.current = null;
      }
    }

    return () => {
      if (threeInstanceRef.current) {
        try {
          threeInstanceRef.current.destroy();
        } catch (e) {}
        threeInstanceRef.current = null;
      }
    };
  }, [activeStyleId, isDualLayerEnabled, layer1Id]);

  // Init Butterchurn when switching to Butterchurn style
  useEffect(() => {
    const currentBase = isDualLayerEnabled
      ? (allUnifiedVisualizers.find(v => v.id === layer1Id) || allUnifiedVisualizers[0])
      : (allUnifiedVisualizers.find(v => v.id === activeStyleId) || allUnifiedVisualizers[0]);

    if (currentBase.engine === 'butterchurn' && canvasButterchurnRef.current && audioRef.current) {
      if (!butterchurnInstanceRef.current) {
        try {
          updateCanvasSizes();
          const engine = audioEngineRef.current;
          const { sourceNode } = engine.initForAudioElement(audioRef.current);
          if (sourceNode) {
            const bc = createButterchurnVisualizer(engine.getContext(), sourceNode, canvasButterchurnRef.current);
            butterchurnInstanceRef.current = bc;
            setCurrentPresetName(bc.getCurrentPresetName());
            setPresetList(bc.getPresetNames());
          }
        } catch (e) {
          console.warn('Butterchurn creation failed:', e);
        }
      }
    }
  }, [activeStyleId, isDualLayerEnabled, layer1Id, updateCanvasSizes]);

  // Animation render loop
  const loop = useCallback((time: number) => {
    try {
      const frameStartTime = performance.now();
      const isLive = isExportingRef.current || isPlayingRef.current || isMicActive;
      
      // Telemetry: measure live FPS and GPU frame time
      frameCountRef.current++;
      const nowMs = performance.now();
      const elapsedFps = nowMs - lastFpsTimestampRef.current;
      if (elapsedFps >= 500) {
        const fps = Math.round((frameCountRef.current * 1000) / elapsedFps);
        setLiveFps(fps);
        setRenderTimeMs(parseFloat((nowMs - frameStartTime).toFixed(1)));
        frameCountRef.current = 0;
        lastFpsTimestampRef.current = nowMs;
      }
      
      const dsp = isLive ? audioEngineRef.current.analyze() : {
        beat: { isBeat: false, isDrop: false, bpm: 0, beatIntensity: 0, timeSinceLastBeat: 0 },
        bands: { subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, brilliance: 0, overallEnergy: 0 }
      };

      if (isLive) {
        // Desktop Engine Optimization: Throttle React UI State updates to ~20 FPS (every 50ms)
        // This prevents React from thrashing the DOM 60-120 times/sec and completely eliminates browser lag/flicker.
        if (nowMs - lastUiUpdateRef.current > 50) {
          lastUiUpdateRef.current = nowMs;
          setBeatState(dsp.beat);
          setBands(dsp.bands);
          if (audioRef.current && !isExportingRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }
      }

      const masterInt = intensityRef.current;
      const rawFreq = audioEngineRef.current?.freqData || new Uint8Array(1024);
      const rawTime = audioEngineRef.current?.timeData || new Uint8Array(1024).fill(128);

      const isDual = isDualLayerEnabledRef.current;
      const l1Sensitivity = isDual ? (layer1IntensityRef.current || 1.0) : 1.0;
      const l2Sensitivity = isDual ? (layer2IntensityRef.current || 1.2) : 1.0;

      const int1 = isLive ? (masterInt * l1Sensitivity) : 0.6;
      const int2 = isLive ? (masterInt * l2Sensitivity) : 0.6;

      // Reusable zero-allocation typed buffers for Layer 1 & 2
      if (!scaledFreq1Ref.current || scaledFreq1Ref.current.length !== rawFreq.length) {
        scaledFreq1Ref.current = new Uint8Array(rawFreq.length);
        scaledTime1Ref.current = new Uint8Array(rawTime.length);
        scaledFreq2Ref.current = new Uint8Array(rawFreq.length);
        scaledTime2Ref.current = new Uint8Array(rawTime.length);
      }
      const scaledFreq1 = scaledFreq1Ref.current;
      const scaledTime1 = scaledTime1Ref.current;
      const scaledFreq2 = scaledFreq2Ref.current;
      const scaledTime2 = scaledTime2Ref.current;

      for (let i = 0; i < rawFreq.length; i++) {
        const idlePulse = isLive ? 0 : Math.sin(time * 0.0015 + i * 0.04) * 12 + 15;
        scaledFreq1[i] = Math.min(255, isLive ? (rawFreq[i] * int1) : idlePulse);
        const tDiff = rawTime[i] - 128;
        scaledTime1[i] = Math.max(0, Math.min(255, 128 + tDiff * int1));
      }

      if (isDual) {
        for (let i = 0; i < rawFreq.length; i++) {
          const idlePulse = isLive ? 0 : Math.cos(time * 0.0015 + i * 0.04) * 12 + 15;
          scaledFreq2[i] = Math.min(255, isLive ? (rawFreq[i] * int2) : idlePulse);
          const tDiff = rawTime[i] - 128;
          scaledTime2[i] = Math.max(0, Math.min(255, 128 + tDiff * int2));
        }
      }

      // Video Speed Remix Processing
      if (videoRef.current && videoUrlRef.current) {
        const vEl = videoRef.current;
        const set = videoRemixSettingsRef.current;
        
        let driverEnergy = 0;
        if (set.freqDriver === 'bass') {
          driverEnergy = (dsp.bands.bass * 1.5 + dsp.bands.subBass * 1.2) / 2.0;
        } else if (set.freqDriver === 'mid') {
          driverEnergy = (dsp.bands.lowMid + dsp.bands.mid) / 2.0;
        } else if (set.freqDriver === 'treble') {
          driverEnergy = (dsp.bands.highMid + dsp.bands.treble) / 2.0;
        } else if (set.freqDriver === 'drop') {
          driverEnergy = dsp.beat.beatIntensity;
        } else {
          driverEnergy = dsp.bands.overallEnergy;
        }

        driverEnergy = Math.max(0, Math.min(1, driverEnergy));

        // Invert curve if enabled
        // Default: Quiet / Lows = Slow (minSpeed), Highs / Loud = Fast (maxSpeed)
        // Inverted: Lows / Bass = Fast (maxSpeed), Highs / Loud = Slow (minSpeed)
        let speedFactor = set.invertReactivity ? (1.0 - driverEnergy) : driverEnergy;
        const curvePow = 1 / Math.max(0.2, set.speedSensitivity);
        speedFactor = Math.pow(Math.max(0, Math.min(1, speedFactor)), curvePow);

        const targetSpeed = set.minSpeed + (set.maxSpeed - set.minSpeed) * speedFactor;
        const smoothRate = 1 - Math.max(0.01, Math.min(0.95, set.smoothing));
        smoothedVideoSpeedRef.current += (targetSpeed - smoothedVideoSpeedRef.current) * smoothRate;
        const effectiveSpeed = Math.max(0.05, Math.min(16, smoothedVideoSpeedRef.current));

        try {
          vEl.playbackRate = effectiveSpeed;
        } catch (e) {}

        // Throttle UI update of current speed
        const nowMs = performance.now();
        if (nowMs - lastSpeedUpdateUIRef.current > 100) {
          lastSpeedUpdateUIRef.current = nowMs;
          setCurrentVideoSpeed(effectiveSpeed);
        }

        // Sync playback state with audio
        if (isPlayingRef.current || isExportingRef.current) {
          if (vEl.paused) {
            vEl.play().catch(e => console.warn(e));
          }
        } else {
          if (!vEl.paused) {
            vEl.pause();
          }
        }

        // End of video handling & Audio-Video Synchronized Loop / Cutoff
        if (vEl.duration > 0 && vEl.currentTime >= vEl.duration - 0.06) {
          if (isExportingRef.current) {
            if (set.endBehavior === 'cut_at_video') {
              // In export: Cut the export immediately at the end of the video! Clean & no black screen.
              stopExportManually();
            } else {
              // Seamless video loop in export
              vEl.currentTime = 0;
              vEl.play().catch(e => console.warn(e));
            }
          } else {
            // In Live Preview:
            if (set.endBehavior === 'cut_at_video') {
              // Synchronize BOTH audio and video to loop together from 0:00 when video finishes!
              if (isLoopingRef.current) {
                vEl.currentTime = 0;
                vEl.play().catch(e => console.warn(e));
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(e => console.warn(e));
                }
              } else {
                // If loop is off, pause both when video reaches the end
                vEl.pause();
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                setIsPlaying(false);
              }
            } else {
              // 'loop_video': only loop video continuously while audio keeps playing
              vEl.currentTime = 0;
              vEl.play().catch(e => console.warn(e));
            }
          }
        }
      }

      const baseItem = isDual 
        ? (allUnifiedVisualizers.find(v => v.id === layer1IdRef.current) || allUnifiedVisualizers[0])
        : (allUnifiedVisualizers.find(v => v.id === activeStyleIdRef.current) || allUnifiedVisualizers[0]);

      // 1. Three.js Engine (Base Layer 1)
      if (baseItem.engine === 'three' && threeInstanceRef.current) {
        try {
          threeInstanceRef.current.update(scaledFreq1, scaledTime1, time, int1);
        } catch (err) {
          console.warn('Three.js update error:', err);
        }
      }
      // 2. Butterchurn Engine (Base Layer 1)
      else if (baseItem.engine === 'butterchurn' && butterchurnInstanceRef.current) {
        try {
          butterchurnInstanceRef.current.render();
        } catch (err) {
          console.warn('Butterchurn render error:', err);
        }
      }
      // 3. Video Remix Engine (Base Layer 1)
      else if (baseItem.engine === 'video' && canvas2DRef.current) {
        const ctx = canvas2DRef.current.getContext('2d');
        const w = canvas2DRef.current.width;
        const h = canvas2DRef.current.height;
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);

          const vEl = videoRef.current;
          if (vEl && vEl.readyState >= 2 && videoUrlRef.current) {
            const vw = vEl.videoWidth || w;
            const vh = vEl.videoHeight || h;
            const set = videoRemixSettingsRef.current;
            
            if (set.videoFit === 'cover') {
              const scale = Math.max(w / vw, h / vh);
              const dw = vw * scale;
              const dh = vh * scale;
              const dx = (w - dw) / 2;
              const dy = (h - dh) / 2;
              ctx.drawImage(vEl, dx, dy, dw, dh);
            } else {
              const scale = Math.min(w / vw, h / vh);
              const dw = vw * scale;
              const dh = vh * scale;
              const dx = (w - dw) / 2;
              const dy = (h - dh) / 2;
              ctx.drawImage(vEl, dx, dy, dw, dh);
            }

            // Drop Flash / Strobe if enabled
            if (set.strobeOnDrop && dsp.beat.isDrop) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fillRect(0, 0, w, h);
            }
          } else {
            // Placeholder guide when no video loaded yet
            ctx.fillStyle = '#09090D';
            ctx.fillRect(0, 0, w, h);
            
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 40, w - 80, h - 80);
            
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lang === 'he' ? '📁 טען סרטון וידאו בטאב "רמיקס וידאו" משמאל' : '📁 Upload a video clip in "Video Remix" tab on the left', w / 2, h / 2 - 20);
            
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px sans-serif';
            ctx.fillText(lang === 'he' ? 'הוידאו ישנה את מהירותו בדינמיקה חיה לפי תדרי האודיו והבסים' : 'Video playback speed will dynamically react to your audio track frequencies & beats', w / 2, h / 2 + 25);
          }
        }
      }
      // 4. 2D Canvas Engine (Base Layer 1)
      else if (baseItem.engine === '2d' && canvas2DRef.current) {
        const ctx = canvas2DRef.current.getContext('2d');
        if (ctx) {
          try {
            const viz = visualizers.find(v => v.id === baseItem.id) || visualizers[0];
            viz.draw(
              ctx, 
              canvas2DRef.current.width, 
              canvas2DRef.current.height, 
              scaledFreq1, 
              scaledTime1, 
              time, 
              { hideBackground: hideStageBackgroundRef.current }
            );
          } catch (err) {
            console.warn('2D draw error:', err);
          }
        }
      }

      // 4. Overlay Layer Engine (Layer 2 with independent sensitivity)
      if (isDual && canvasOverlay2DRef.current) {
        const ctxOverlay = canvasOverlay2DRef.current.getContext('2d');
        if (ctxOverlay) {
          try {
            const overlayId = layer2IdRef.current;
            const overlayViz = visualizers.find(v => v.id === overlayId) || visualizers[0];
            ctxOverlay.clearRect(0, 0, canvasOverlay2DRef.current.width, canvasOverlay2DRef.current.height);
            const hideOverlayBg = layerTransformRef.current.hideStageBg || hideStageBackgroundRef.current;
            overlayViz.draw(
              ctxOverlay, 
              canvasOverlay2DRef.current.width, 
              canvasOverlay2DRef.current.height, 
              scaledFreq2, 
              scaledTime2, 
              time, 
              { hideBackground: hideOverlayBg }
            );
          } catch (err) {
            console.warn('Layer 2 draw error:', err);
          }
        }
      }

      // 5. Composite Frame for Video Export & B&W Matte Pass
      if ((isExportingRef.current || previewBWRef.current) && canvasExportCompositeRef.current) {
        const compCtx = canvasExportCompositeRef.current.getContext('2d');
        const w = canvasExportCompositeRef.current.width;
        const h = canvasExportCompositeRef.current.height;
        if (compCtx) {
          compCtx.clearRect(0, 0, w, h);
          
          const baseCanvas = baseItem.engine === 'three'
            ? canvasThreeRef.current
            : baseItem.engine === 'butterchurn'
            ? canvasButterchurnRef.current
            : canvas2DRef.current;

          if (baseCanvas) {
            compCtx.drawImage(baseCanvas, 0, 0, w, h);
          }

          if (isDual && canvasOverlay2DRef.current) {
            const tr = layerTransformRef.current;
            compCtx.save();
            compCtx.globalAlpha = tr.opacity;
            compCtx.globalCompositeOperation = tr.blendMode === 'source-over' ? 'source-over' : tr.blendMode === 'screen' ? 'screen' : tr.blendMode === 'lighten' ? 'lighter' : tr.blendMode === 'color-dodge' ? 'color-dodge' : 'source-over';
            
            const cx = w / 2;
            const cy = h / 2;
            compCtx.translate(cx + (tr.posX / 100) * w, cy + (tr.posY / 100) * h);
            
            const zScale = Math.max(0.2, 1000 / (1000 - tr.depthZ));
            const beatBoost = tr.beatReactivity && dsp.beat.isBeat ? 1.08 + dsp.beat.beatIntensity * 0.08 * Math.min(2.5, l2Sensitivity) : 1.0;
            const totalScale = tr.scale * zScale * beatBoost;
            
            if (tr.mirrorX) compCtx.scale(-1, 1);
            compCtx.rotate((tr.rotateZ * Math.PI) / 180);
            compCtx.scale(totalScale * Math.cos((tr.rotateY * Math.PI) / 180), totalScale * Math.cos((tr.rotateX * Math.PI) / 180));
            
            compCtx.drawImage(canvasOverlay2DRef.current, -w / 2, -h / 2, w, h);
            compCtx.restore();
          }

          // Generate Pure High-Contrast Black & White Matte Canvas (Pure white elements on #000000 black)
          if (canvasExportBWRef.current) {
            const bwCtx = canvasExportBWRef.current.getContext('2d');
            if (bwCtx) {
              bwCtx.save();
              bwCtx.fillStyle = '#000000';
              bwCtx.fillRect(0, 0, w, h);
              bwCtx.filter = 'grayscale(100%) contrast(5000%) brightness(300%)';
              bwCtx.drawImage(canvasExportCompositeRef.current, 0, 0, w, h);
              bwCtx.restore();
            }
          }

          // 6. Real-time Frame Sampling (for Image Sequence ZIP Export)
          if (isExportingRef.current && (exportTargetRef.current === 'frames' || exportTargetRef.current === 'both')) {
            if (audioRef.current) {
              const audioCurTime = audioRef.current.currentTime;
              if (audioCurTime >= nextFrameCaptureTimeRef.current) {
                const compC = canvasExportCompositeRef.current;
                const bwC = canvasExportBWRef.current;
                const fNum = frameSequenceIndexRef.current++;
                const fmt = framesFormatRef.current;
                const mime = fmt === 'png' ? 'image/png' : 'image/jpeg';
                const ext = fmt === 'png' ? 'png' : 'jpg';
                const frameFileName = `frame_${String(fNum).padStart(5, '0')}.${ext}`;
                const mode = exportPassModeRef.current;
                const shouldColor = mode === 'color' || mode === 'both';
                const shouldBW = mode === 'bw_matte' || mode === 'both';

                if (shouldColor && compC) {
                  compC.toBlob((blob) => {
                    if (blob) {
                      framesListRef.current.push({
                        path: mode === 'both' ? `frames_color/${frameFileName}` : `frames/${frameFileName}`,
                        blob
                      });
                      setCapturedFramesCount(framesListRef.current.length);
                    }
                  }, mime, 0.95);
                }

                if (shouldBW && bwC) {
                  bwC.toBlob((blob) => {
                    if (blob) {
                      framesListRef.current.push({
                        path: mode === 'both' ? `frames_bw_matte/${frameFileName}` : `frames/${frameFileName}`,
                        blob
                      });
                      setCapturedFramesCount(framesListRef.current.length);
                    }
                  }, mime, 0.95);
                }

                nextFrameCaptureTimeRef.current += (1 / exportFpsRef.current);
              }
            }
          }
        }
      }

    } catch (err) {
      console.warn('Render loop frame error:', err);
    } finally {
      reqRef.current = requestAnimationFrame(loop);
    }
  }, [isMicActive]);

  useEffect(() => {
    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [loop]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioFile(file);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsMicActive(false);
  };

  const handleUploadVideo = (file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFile(file);
    setActiveStyleId('video_speed_remix');
    setActiveSidebarTab('video');
  };

  const handleLoadDemoVideo = async () => {
    setIsLoadingDemoVideo(true);
    try {
      const blob = await generateProceduralDemoVideoBlob();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(blob);
      const fakeFile = new File([blob], 'Demo_VJ_Neon_Tunnel.webm', { type: blob.type || 'video/webm' });
      setVideoUrl(url);
      setVideoFile(fakeFile);
      setActiveStyleId('video_speed_remix');
      setActiveSidebarTab('video');
    } catch (err) {
      console.error('Failed to generate demo video:', err);
    } finally {
      setIsLoadingDemoVideo(false);
    }
  };

  const handleMatchVideoDimensions = () => {
    if (!videoDimensions) return;
    const { width, height } = videoDimensions;
    const ratio = width / height;

    if (Math.abs(ratio - 16 / 9) < 0.15) {
      setExportAr('16:9');
    } else if (Math.abs(ratio - 9 / 16) < 0.15) {
      setExportAr('9:16');
    } else if (Math.abs(ratio - 1) < 0.15) {
      setExportAr('1:1');
    }

    if (height >= 2000 || width >= 3800) {
      setExportRes('4k');
    } else if (height >= 1000 || width >= 1900) {
      setExportRes('1080p');
    } else {
      setExportRes('720p');
    }
  };

  const handleAudioLoad = () => {
    if (!audioRef.current) return;
    const engine = audioEngineRef.current;
    const { sourceNode } = engine.initForAudioElement(audioRef.current);

    if (activeItem.engine === 'butterchurn' && canvasButterchurnRef.current && !butterchurnInstanceRef.current && sourceNode) {
      try {
        updateCanvasSizes();
        const bc = createButterchurnVisualizer(engine.getContext(), sourceNode, canvasButterchurnRef.current);
        butterchurnInstanceRef.current = bc;
        setCurrentPresetName(bc.getCurrentPresetName());
        setPresetList(bc.getPresetNames());
      } catch (e) {
        console.warn('Butterchurn creation failed:', e);
      }
    }
  };

  // Immediate single-frame render for scrub/seek preview when paused
  const renderSingleFrame = useCallback(() => {
    const vEl = videoRef.current;
    if (canvas2DRef.current && vEl && vEl.readyState >= 2 && videoUrlRef.current) {
      const ctx = canvas2DRef.current.getContext('2d');
      const w = canvas2DRef.current.width;
      const h = canvas2DRef.current.height;
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        const vw = vEl.videoWidth || w;
        const vh = vEl.videoHeight || h;
        const set = videoRemixSettingsRef.current;
        const scale = set.videoFit === 'cover' ? Math.max(w / vw, h / vh) : Math.min(w / vw, h / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;
        ctx.drawImage(vEl, dx, dy, dw, dh);
      }
    }
  }, []);

  // Listen to video element seeked events so paused frame updates immediately
  useEffect(() => {
    const vEl = videoRef.current;
    if (!vEl) return;
    const onSeeked = () => {
      renderSingleFrame();
    };
    vEl.addEventListener('seeked', onSeeked);
    return () => vEl.removeEventListener('seeked', onSeeked);
  }, [renderSingleFrame, videoUrl]);

  // Synchronized Master Seek: controls Audio and Video simultaneously to exact point X
  const seekTo = useCallback((targetSec: number) => {
    const maxDur = duration || (audioRef.current?.duration) || 10000;
    const clamped = Math.max(0, Math.min(maxDur, targetSec));
    setCurrentTime(clamped);

    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }

    if (videoRef.current && videoUrlRef.current && videoRef.current.duration > 0) {
      const vDur = videoRef.current.duration;
      let vTarget = clamped;
      if (vTarget >= vDur) {
        if (videoRemixSettingsRef.current.endBehavior === 'loop_video' || isLoopingRef.current) {
          vTarget = clamped % vDur;
        } else {
          vTarget = Math.min(clamped, vDur);
        }
      }
      videoRef.current.currentTime = vTarget;
    }

    // Force frame update so user sees frame at point X without needing to press play
    renderSingleFrame();
  }, [duration, renderSingleFrame]);

  // Skip relative seconds (e.g. -5s, +5s, -1s, +1s)
  const skipTime = useCallback((deltaSec: number) => {
    const baseTime = audioRef.current?.currentTime ?? currentTime;
    seekTo(baseTime + deltaSec);
  }, [currentTime, seekTo]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    const ctx = audioEngineRef.current.getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
    } else {
      audioRef.current.play();
      if (videoRef.current && videoUrl) videoRef.current.play().catch(e => console.warn(e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleLoadDemoTrack = (style: 'synthwave' | 'edm' | 'lofi') => {
    const blob = generateProceduralAudioBlob(style);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(blob);
    
    const fakeFile = new File([blob], `Demo_${style.toUpperCase()}_Track.wav`, { type: 'audio/wav' });
    setAudioUrl(url);
    setAudioFile(fakeFile);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsMicActive(false);
  };

  const handleToggleMic = async () => {
    if (isMicActive) {
      audioEngineRef.current.disableMicrophone();
      setIsMicActive(false);
    } else {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      const ok = await audioEngineRef.current.enableMicrophone();
      if (ok) setIsMicActive(true);
    }
  };

  // Fullscreen VJ toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.warn(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(e => console.warn(e));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(e.shiftKey ? -1 : -5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(e.shiftKey ? 1 : 5);
      } else if (e.code === 'Home') {
        e.preventDefault();
        seekTo(0);
      } else if (e.key === 'j' || e.key === 'J') {
        skipTime(-5);
      } else if (e.key === 'k' || e.key === 'K') {
        togglePlay();
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLooping(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMic();
      } else if (e.key === 'r' || e.key === 'R') {
        if (activeItem.engine === 'butterchurn' && butterchurnInstanceRef.current) {
          const rand = butterchurnInstanceRef.current.loadRandomPreset();
          setCurrentPresetName(rand);
        } else {
          // Switch to random visualizer
          const randIdx = Math.floor(Math.random() * allUnifiedVisualizers.length);
          setActiveStyleId(allUnifiedVisualizers[randIdx].id);
        }
      } else if (e.key === 'y' || e.key === 'Y' || e.key === 'ט') {
        e.preventDefault();
        setShowGitHubModal(true);
        setShowUpdateToast(true);
        navigator.clipboard.writeText('npm run update').catch(() => {});
        setTimeout(() => setShowUpdateToast(false), 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipTime, seekTo, activeItem.engine]);

  // Finalize export (Video and/or Frames ZIP)
  const finalizeExport = async (timestamp: number) => {
    const shouldExportFrames = exportTargetRef.current === 'frames' || exportTargetRef.current === 'both';
    
    if (shouldExportFrames && framesListRef.current.length > 0) {
      setIsCompressingZip(true);
      try {
        const zip = new JSZip();
        const compCanvas = canvasExportCompositeRef.current;
        const w = compCanvas ? compCanvas.width : 1920;
        const h = compCanvas ? compCanvas.height : 1080;
        
        framesListRef.current.forEach(item => {
          zip.file(item.path, item.blob);
        });

        // Sequence metadata info file
        const infoTxt = `RetroViz Studio - Image Sequence Export
======================================================
Visualizer: ${activeItem.nameEn} (${activeItem.id})
Audio Track: ${audioFile ? audioFile.name : 'Demo Track'}
Resolution: ${exportResRef.current} (${w}x${h})
Aspect Ratio: ${exportArRef.current}
Frame Rate: ${exportFpsRef.current} FPS
Frame Image Format: ${framesFormatRef.current.toUpperCase()}
Total Captured Frames: ${framesListRef.current.length}
Color Mode: ${exportPassModeRef.current}
Timestamp: ${new Date().toISOString()}

Folders included in this ZIP:
${exportPassModeRef.current === 'both' 
  ? '- /frames_color/ : Full color frames sequence\n- /frames_bw_matte/ : Pure B&W Matte mask frames sequence' 
  : '- /frames/ : Image sequence frames'}
======================================================
`;
        zip.file('README_FRAMES_INFO.txt', infoTxt);

        const zipBlob = await zip.generateAsync(
          { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } },
          (meta) => {
            setZipProgress(Math.round(meta.percent));
          }
        );

        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `RetroViz_${activeItem.id}_Frames_${exportFpsRef.current}fps_${timestamp}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(zipUrl), 3000);
      } catch (err) {
        console.error('Error generating frames zip:', err);
      } finally {
        setIsCompressingZip(false);
      }
    }

    setIsExporting(false);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    if (videoRef.current) videoRef.current.pause();
  };

  // Video & Frames Export (Supports 12 FPS, 24 FPS, 30 FPS, 60 FPS, Video + Frames ZIP folder, Color & Pure B&W Matte Pass)
  const startExport = async () => {
    if (!audioRef.current) return;
    
    const compCanvas = canvasExportCompositeRef.current;
    const bwCanvas = canvasExportBWRef.current;
    if (!compCanvas || !bwCanvas) return;

    framesListRef.current = [];
    frameSequenceIndexRef.current = 1;
    nextFrameCaptureTimeRef.current = 0;
    setCapturedFramesCount(0);
    setZipProgress(0);
    setIsCompressingZip(false);

    setIsExporting(true);
    setIsPlaying(true);
    updateCanvasSizes();
    
    if (videoRef.current && videoUrlRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.warn(e));
    }
    
    let bps = 5000000;
    if (exportRes === '1080p') bps = 10000000;
    if (exportRes === '4k') bps = 25000000;

    const ctx = audioEngineRef.current.getContext();
    const dest = ctx.createMediaStreamDestination();
    
    const { analyser } = audioEngineRef.current.initForAudioElement(audioRef.current);
    if (analyser) {
      analyser.connect(dest);
    }

    const audioTrack = dest.stream.getAudioTracks()[0];

    const mimeType = exportFormat === 'webm' ? 'video/webm;codecs=vp9' : 'video/mp4';
    let finalOptions = { mimeType, videoBitsPerSecond: bps };
    
    if (!MediaRecorder.isTypeSupported(finalOptions.mimeType)) {
      finalOptions = { mimeType: 'video/webm', videoBitsPerSecond: bps };
    }

    const ext = finalOptions.mimeType.includes('mp4') ? 'mp4' : 'webm';
    const timestamp = Date.now();

    const handleDownloadVideo = (blob: Blob, suffix: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RetroViz_${activeItem.id}_${suffix}_${timestamp}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
    };

    const mode = exportPassModeRef.current;
    const target = exportTargetRef.current;
    const shouldExportVideo = target === 'video' || target === 'both';
    const shouldExportColor = shouldExportVideo && (mode === 'color' || mode === 'both');
    const shouldExportBW = shouldExportVideo && (mode === 'bw_matte' || mode === 'both');

    let finishedCount = 0;
    const totalRecorders = shouldExportVideo ? (mode === 'both' ? 2 : 1) : 0;

    const checkAllFinished = () => {
      finishedCount++;
      if (finishedCount >= totalRecorders) {
        if (analyser) {
          try { analyser.disconnect(dest); } catch(e) {}
        }
        finalizeExport(timestamp);
      }
    };

    // 1. Color Video Pass
    if (shouldExportColor) {
      const streamColor = compCanvas.captureStream(exportFps);
      if (audioTrack) {
        streamColor.addTrack(audioTrack);
      }
      const recColor = new MediaRecorder(streamColor, finalOptions);
      mediaRecorderColorRef.current = recColor;
      const chunksColor: Blob[] = [];
      recColor.ondataavailable = (e) => {
        if (e.data.size > 0) chunksColor.push(e.data);
      };
      recColor.onstop = () => {
        const blob = new Blob(chunksColor, { type: finalOptions.mimeType });
        handleDownloadVideo(blob, mode === 'both' ? 'Color' : 'Video');
        checkAllFinished();
      };
      recColor.start();
    }

    // 2. Pure B&W Matte Pass
    if (shouldExportBW) {
      const streamBW = bwCanvas.captureStream(exportFps);
      if (audioTrack) {
        streamBW.addTrack(audioTrack);
      }
      const recBW = new MediaRecorder(streamBW, finalOptions);
      mediaRecorderBWRef.current = recBW;
      const chunksBW: Blob[] = [];
      recBW.ondataavailable = (e) => {
        if (e.data.size > 0) chunksBW.push(e.data);
      };
      recBW.onstop = () => {
        const blob = new Blob(chunksBW, { type: finalOptions.mimeType });
        handleDownloadVideo(blob, 'BW_Matte');
        checkAllFinished();
      };
      recBW.start();
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  const stopExportManually = () => {
    if (isExportingRef.current) {
      if (audioRef.current) audioRef.current.pause();
      if (videoRef.current) videoRef.current.pause();
      setIsPlaying(false);
      const shouldExportVideo = exportTargetRef.current === 'video' || exportTargetRef.current === 'both';
      let hasRunningRecorder = false;

      if (mediaRecorderColorRef.current && mediaRecorderColorRef.current.state !== 'inactive') {
        mediaRecorderColorRef.current.stop();
        hasRunningRecorder = true;
      }
      if (mediaRecorderBWRef.current && mediaRecorderBWRef.current.state !== 'inactive') {
        mediaRecorderBWRef.current.stop();
        hasRunningRecorder = true;
      }

      if (!hasRunningRecorder || !shouldExportVideo) {
        finalizeExport(Date.now());
      }
    }
  };

  const handleAudioEnded = () => {
    if (isExportingRef.current) {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
      const shouldExportVideo = exportTargetRef.current === 'video' || exportTargetRef.current === 'both';
      let hasRunningRecorder = false;

      if (mediaRecorderColorRef.current && mediaRecorderColorRef.current.state !== 'inactive') {
        mediaRecorderColorRef.current.stop();
        hasRunningRecorder = true;
      }
      if (mediaRecorderBWRef.current && mediaRecorderBWRef.current.state !== 'inactive') {
        mediaRecorderBWRef.current.stop();
        hasRunningRecorder = true;
      }

      if (!hasRunningRecorder || !shouldExportVideo) {
        finalizeExport(Date.now());
      }
    } else if (isLoopingRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.warn('Loop playback error:', e));
      if (videoRef.current && videoUrl) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.warn(e));
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filteredVisualizers = allUnifiedVisualizers.filter(v => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'video') return v.engine === 'video';
    if (categoryFilter === 'three') return v.engine === 'three';
    if (categoryFilter === 'butterchurn') return v.engine === 'butterchurn';
    if (categoryFilter === '2d') return v.engine === '2d';
    return true;
  });

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className={`h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans selection:bg-cyan-500 selection:text-white flex flex-col overflow-hidden ${lang === 'he' ? 'text-right' : 'text-left'}`}>
      
      {/* Desktop Workstation Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#121214] shrink-0 z-20 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Monitor size={18} className="text-white" />
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-indigo-300">
              {t.title}
            </h1>
            
            {/* Workstation Live Telemetry & Dynamic Resolution Mode */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowPerfMenu(prev => !prev)}
                title={lang === 'he' ? 'פרופיל ביצועים ודיאגנוסטיקה (לחץ לשינוי)' : 'Performance Profile & Diagnostics (Click to switch)'}
                className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 hover:border-cyan-500/40 text-[10px] font-mono text-gray-300 flex items-center gap-2 transition-all shadow-inner cursor-pointer"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${liveFps >= 50 ? 'bg-emerald-400 animate-pulse' : liveFps >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className={`font-bold ${liveFps >= 50 ? 'text-emerald-300' : liveFps >= 30 ? 'text-yellow-300' : 'text-red-300'}`}>
                  {liveFps} FPS
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{renderTimeMs}ms</span>
                <span className="text-gray-500">•</span>
                <span className="text-cyan-400 uppercase font-bold text-[9px]">{performanceProfile}</span>
              </button>

              {/* Performance Profile Dropdown */}
              {showPerfMenu && (
                <div 
                  className={`absolute top-full mt-2 ${lang === 'he' ? 'right-0' : 'left-0'} w-64 p-2 bg-[#18181b] border border-white/15 rounded-xl shadow-2xl z-50 text-xs space-y-1`}
                  onMouseLeave={() => setShowPerfMenu(false)}
                >
                  <div className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider px-2 py-1 flex items-center justify-between border-b border-white/10">
                    <span>{lang === 'he' ? 'פרופיל ביצועים לתצוגה' : 'Viewport Engine Profile'}</span>
                    <Cpu size={11} className="text-cyan-400" />
                  </div>

                  <button
                    onClick={() => { setPerformanceProfile('balanced'); setShowPerfMenu(false); }}
                    className={`w-full text-start p-2 rounded-lg flex items-center justify-between transition-colors ${
                      performanceProfile === 'balanced' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{lang === 'he' ? 'מאוזן (720p 60FPS) - מומלץ' : 'Balanced (720p 60FPS) - Default'}</div>
                      <div className="text-[9px] text-gray-400 font-normal">{lang === 'he' ? 'חלק ללא תקיעות, ניצול זיכרון מינימלי' : 'Silky smooth, low GPU heat & memory'}</div>
                    </div>
                    {performanceProfile === 'balanced' && <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />}
                  </button>

                  <button
                    onClick={() => { setPerformanceProfile('workstation'); setShowPerfMenu(false); }}
                    className={`w-full text-start p-2 rounded-lg flex items-center justify-between transition-colors ${
                      performanceProfile === 'workstation' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{lang === 'he' ? 'תחנת עבודה (1080p HD)' : 'Workstation (1080p HD)'}</div>
                      <div className="text-[9px] text-gray-400 font-normal">{lang === 'he' ? 'חדות מרבית למסכי 4K / מחשבי עריכה' : 'Maximum sharpness for studio monitors'}</div>
                    </div>
                    {performanceProfile === 'workstation' && <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />}
                  </button>

                  <button
                    onClick={() => { setPerformanceProfile('eco'); setShowPerfMenu(false); }}
                    className={`w-full text-start p-2 rounded-lg flex items-center justify-between transition-colors ${
                      performanceProfile === 'eco' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{lang === 'he' ? 'חסכון במשאבים (540p Eco)' : 'Eco Saver (540p)'}</div>
                      <div className="text-[9px] text-gray-400 font-normal">{lang === 'he' ? 'למחשבים ניידים ומערכות חלשות' : 'Minimal RAM & battery consumption'}</div>
                    </div>
                    {performanceProfile === 'eco' && <CheckCircle2 size={13} className="text-cyan-400 shrink-0" />}
                  </button>

                  <div className="px-2 pt-1 border-t border-white/5 text-[9px] text-gray-400 font-mono">
                    {lang === 'he' ? '💡 ייצוא וידאו תמיד מרונדר באיכות מלאה לפי הגדרות השמירה' : '💡 Final video export always renders in 100% full export resolution'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workstation Controls: Update Button, VJ HUD & Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Desktop Software Updater Button */}
          <button
            onClick={() => setShowGitHubModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
              hasNewGitHubUpdate 
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-black font-black border-cyan-400 shadow-lg shadow-cyan-500/25 animate-pulse' 
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200 hover:text-white'
            }`}
            title={lang === 'he' ? 'בדוק והתקן עדכון מ-GitHub (מקש Y)' : 'Check & Install Update from GitHub (Key Y)'}
          >
            <RefreshCw size={13} className={hasNewGitHubUpdate ? 'animate-spin-slow' : 'text-cyan-400'} />
            <span className="font-mono">
              {hasNewGitHubUpdate 
                ? (lang === 'he' ? 'קיים עדכון! [Y]' : 'Update Available! [Y]') 
                : (lang === 'he' ? 'עדכון תוכנה [Y]' : 'Check Updates [Y]')}
            </span>
            {hasNewGitHubUpdate && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
            )}
          </button>

          <VJModeHUD 
            lang={lang}
            beatState={beatState}
            bands={bands}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onOpenShortcuts={() => setShowShortcutsModal(true)}
            isDualLayerEnabled={isDualLayerEnabled}
            onToggleDualLayer={() => {
              const next = !isDualLayerEnabled;
              setIsDualLayerEnabled(next);
              if (next) setActiveSidebarTab('dual');
            }}
            currentVideoSpeed={currentVideoSpeed}
            isVideoModeActive={activeItem.engine === 'video'}
          />

          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            <button 
              onClick={() => setLang('en')} 
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${lang === 'en' ? 'bg-cyan-500 text-black font-bold' : 'opacity-60 hover:opacity-100'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('he')} 
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${lang === 'he' ? 'bg-cyan-500 text-black font-bold' : 'opacity-60 hover:opacity-100'}`}
            >
              עברית
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Styles / Video Remix / Dual Layer 3D / Audio FX */}
        <aside className="w-72 lg:w-80 border-e border-white/5 flex flex-col bg-[#121214] shrink-0">
          
          {/* Top Tabs: Visualizers vs Video Remix vs Dual Layer vs Audio FX */}
          <div className="grid grid-cols-4 p-1 border-b border-white/5 bg-black/40 shrink-0 gap-1">
            <button
              onClick={() => setActiveSidebarTab('styles')}
              className={`py-2 text-[10px] sm:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all truncate ${
                activeSidebarTab === 'styles'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film size={12} className="shrink-0" />
              <span className="truncate">{t.styles}</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('video')}
              className={`py-2 text-[10px] sm:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all truncate relative ${
                activeSidebarTab === 'video'
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <VideoIcon size={12} className="shrink-0" />
              <span className="truncate">{lang === 'he' ? 'וידאו' : 'Video'}</span>
              {videoUrl && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab('dual')}
              className={`py-2 text-[10px] sm:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all truncate relative ${
                activeSidebarTab === 'dual'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-black font-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={12} className="shrink-0" />
              <span className="truncate">{t.dualLayerTab || (lang === 'he' ? 'שכבות' : 'Dual')}</span>
              {isDualLayerEnabled && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab('fx')}
              className={`py-2 text-[10px] sm:text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all truncate ${
                activeSidebarTab === 'fx'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders size={12} className="shrink-0" />
              <span className="truncate">{lang === 'he' ? 'FX' : 'DSP'}</span>
            </button>
          </div>

          {activeSidebarTab === 'styles' ? (
            <>
              {/* Category Filter Tabs */}
              <div className="p-2 border-b border-white/5 bg-black/20 shrink-0">
                <div className="grid grid-cols-5 gap-1 p-0.5 bg-white/5 rounded-lg text-[9px] font-bold">
                  <button 
                    onClick={() => setCategoryFilter('all')}
                    className={`py-1.5 rounded transition-all ${categoryFilter === 'all' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    {lang === 'he' ? 'הכל' : 'All'}
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('video')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-0.5 ${categoryFilter === 'video' ? 'bg-emerald-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <VideoIcon size={10} />
                    {lang === 'he' ? 'וידאו' : 'Video'}
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('three')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-0.5 ${categoryFilter === 'three' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Box size={10} />
                    3D
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('butterchurn')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-0.5 ${categoryFilter === 'butterchurn' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Sparkles size={10} />
                    Milk
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('2d')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-0.5 ${categoryFilter === '2d' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Layers size={10} />
                    2D
                  </button>
                </div>
              </div>

              {/* Style List */}
              <div className="p-3 flex-1 flex flex-col min-h-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-500 font-bold mb-3 flex items-center justify-between shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Film size={13} />
                    {t.styles} ({filteredVisualizers.length})
                  </span>
                </div>
                
                <div className="space-y-1.5 overflow-y-auto flex-1 pe-1 custom-scrollbar">
                  {filteredVisualizers.map(v => (
                    <button 
                      key={v.id}
                      onClick={() => !isExporting && setActiveStyleId(v.id)}
                      disabled={isExporting}
                      className={`w-full text-start p-2.5 rounded-lg flex items-center justify-between transition-all border ${
                        activeStyleId === v.id 
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10' 
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/5 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          v.engine === 'video' ? 'bg-emerald-400 animate-pulse' :
                          v.engine === 'three' ? 'bg-indigo-400' : v.engine === 'butterchurn' ? 'bg-fuchsia-400' : 'bg-cyan-400'
                        }`} />
                        <span className="text-xs font-medium truncate">{lang === 'en' ? v.nameEn : v.nameHe}</span>
                      </div>
                      {v.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                          v.engine === 'video' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          v.engine === 'three' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          v.engine === 'butterchurn' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' :
                          'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {v.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reactivity Control */}
              <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Volume2 size={13} className="text-cyan-400" />
                    {t.reactivityIntensity}
                  </span>
                  <span className="text-cyan-400 font-mono text-xs">{intensity.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" max="3.0" step="0.1"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Stage Background / Flashing Floor Toggle for Character / 2D */}
              {(activeItem.id === 'dancing_man' || activeItem.engine === '2d') && (
                <div className="p-3 border-t border-white/5 bg-cyan-950/20 shrink-0">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="space-y-0.5 pe-2">
                      <span className="text-[11px] font-bold text-cyan-300 group-hover:text-white flex items-center gap-1.5 transition-colors">
                        <Sparkles size={12} className={hideStageBackground ? "text-cyan-400" : "text-yellow-400"} />
                        {t.stageBgToggle}
                      </span>
                      <p className="text-[9px] text-gray-400 leading-tight">
                        {hideStageBackground ? t.stageBgOff : t.stageBgOn}
                      </p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={hideStageBackground}
                      onChange={(e) => setHideStageBackground(e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              )}
            </>
          ) : activeSidebarTab === 'video' ? (
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
              <VideoRemixPanel
                lang={lang}
                videoFile={videoFile}
                videoUrl={videoUrl}
                videoDimensions={videoDimensions}
                videoDuration={videoDuration}
                currentSpeed={currentVideoSpeed}
                currentVideoSpeed={currentVideoSpeed}
                settings={videoRemixSettings}
                onUpdateSettings={(newSettings) => setVideoRemixSettings(prev => ({ ...prev, ...newSettings }))}
                onUploadVideo={handleUploadVideo}
                onLoadDemoVideo={handleLoadDemoVideo}
                isLoadingDemoVideo={isLoadingDemoVideo}
                isLoadingDemo={isLoadingDemoVideo}
                onMatchDimensions={handleMatchVideoDimensions}
                onMatchVideoDimensions={handleMatchVideoDimensions}
                isExporting={isExporting}
                isActiveStyle={activeItem.engine === 'video'}
                onSelectVideoStyle={() => setActiveStyleId('video_speed_remix')}
              />
            </div>
          ) : activeSidebarTab === 'dual' ? (
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
              <SpatialLayerControls
                lang={lang}
                isDualLayerEnabled={isDualLayerEnabled}
                setIsDualLayerEnabled={setIsDualLayerEnabled}
                layer1Id={layer1Id}
                setLayer1Id={setLayer1Id}
                layer2Id={layer2Id}
                setLayer2Id={setLayer2Id}
                layer1Intensity={layer1Intensity}
                setLayer1Intensity={setLayer1Intensity}
                layer2Intensity={layer2Intensity}
                setLayer2Intensity={setLayer2Intensity}
                visualizerOptions={allUnifiedVisualizers}
                transform={layerTransform}
                setTransform={setLayerTransform}
                isExporting={isExporting}
              />
            </div>
          ) : (
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
              <AudioFXPanel
                lang={lang}
                bassBoost={bassBoost}
                setBassBoost={setBassBoost}
                djFilter={djFilter}
                setDjFilter={setDjFilter}
                activePalette={activePalette}
                setActivePalette={setActivePalette}
                isMicActive={isMicActive}
                onToggleMic={handleToggleMic}
                onLoadDemoTrack={handleLoadDemoTrack}
                crtEffect={crtEffect}
                setCrtEffect={setCrtEffect}
                bloomEffect={bloomEffect}
                setBloomEffect={setBloomEffect}
                glitchOnDrop={glitchOnDrop}
                setGlitchOnDrop={setGlitchOnDrop}
                isExporting={isExporting}
              />
            </div>
          )}
        </aside>

        {/* Center: Stage Viewport & Controls */}
        <section className="flex-1 flex flex-col bg-black relative overflow-hidden min-w-0">
          
          {/* Live Preview Pill & Engine / Dual indicator */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 max-w-[calc(100%-80px)]">
            {(audioUrl || isMicActive) && (
              <div className="px-3 py-1 bg-black/70 border border-white/15 backdrop-blur-md rounded-full text-[10px] text-cyan-400 font-mono flex items-center gap-2 shadow-xl">
                <div className={`w-1.5 h-1.5 rounded-full ${isMicActive ? 'bg-rose-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></div>
                {isMicActive ? 'MIC LIVE INPUT' : `AUDIO: ${audioFile?.name?.toUpperCase() || 'PLAYING'}`}
              </div>
            )}

            {activeItem.engine === 'video' && (
              <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 backdrop-blur-md rounded-full text-[10px] font-mono text-emerald-300 shadow-xl flex items-center gap-2">
                <VideoIcon size={12} className="text-emerald-400 animate-pulse" />
                <span>SPEED: {currentVideoSpeed.toFixed(2)}x</span>
                {videoDimensions && (
                  <span className="text-[9px] text-emerald-400/80">({videoDimensions.width}x{videoDimensions.height})</span>
                )}
              </div>
            )}
            
            {isDualLayerEnabled ? (
              <div className="px-3 py-1 bg-gradient-to-r from-cyan-950/80 via-indigo-950/80 to-purple-950/80 border border-cyan-500/50 backdrop-blur-md rounded-full text-[10px] font-mono text-cyan-200 shadow-xl flex items-center gap-2">
                <Layers size={12} className="text-cyan-400 animate-pulse" />
                <span>
                  {lang === 'he' ? 'שכבה 1:' : 'L1:'} {allUnifiedVisualizers.find(v => v.id === layer1Id)?.[lang === 'he' ? 'nameHe' : 'nameEn']} + {lang === 'he' ? 'שכבה 2 (3D):' : 'L2 (3D):'} {allUnifiedVisualizers.find(v => v.id === layer2Id)?.[lang === 'he' ? 'nameHe' : 'nameEn']}
                </span>
                <span className="px-1.5 py-0.2 bg-cyan-500/30 rounded text-[9px] text-cyan-300 font-bold">
                  Z: {layerTransform.depthZ > 0 ? `+${layerTransform.depthZ}` : layerTransform.depthZ}px
                </span>
              </div>
            ) : activeItem.engine !== 'video' && (
              <div className="px-2.5 py-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-full text-[9px] font-mono text-gray-400">
                ENGINE: {activeItem.engine.toUpperCase()}
              </div>
            )}
          </div>

          {/* 3D Camera Controls overlay when in Three.js */}
          {activeItem.engine === 'three' && !isDualLayerEnabled && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <div className="px-3 py-1 bg-black/70 border border-white/15 backdrop-blur-md rounded-full text-[10px] text-indigo-300 font-mono flex items-center gap-2 shadow-xl hidden md:flex">
                <Compass size={12} className="animate-spin text-indigo-400" />
                {t.cameraHint}
              </div>
              <button 
                onClick={() => threeInstanceRef.current?.resetCamera()}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md rounded-full text-[10px] text-white flex items-center gap-1.5 transition-colors shadow-xl"
                title="Reset Camera View"
              >
                <RotateCcw size={11} />
                <span>{t.resetCamera}</span>
              </button>
            </div>
          )}

          {/* Butterchurn Preset Control Toolbar overlay */}
          {activeItem.engine === 'butterchurn' && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 max-w-[calc(100%-180px)]">
              <div className="flex items-center gap-1.5 bg-black/80 border border-white/15 backdrop-blur-md p-1.5 rounded-xl shadow-2xl">
                <button
                  onClick={() => {
                    if (butterchurnInstanceRef.current) {
                      const next = butterchurnInstanceRef.current.prevPreset();
                      setCurrentPresetName(next);
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
                  title="Previous Preset"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  onClick={() => {
                    if (butterchurnInstanceRef.current) {
                      const rand = butterchurnInstanceRef.current.loadRandomPreset();
                      setCurrentPresetName(rand);
                    }
                  }}
                  className="px-2 py-1 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                  title="Random Preset"
                >
                  <Shuffle size={12} />
                  <span className="hidden sm:inline">{t.randomPreset}</span>
                </button>

                <select
                  value={currentPresetName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentPresetName(val);
                    butterchurnInstanceRef.current?.loadPreset(val);
                  }}
                  className="bg-[#1A1A1E] border border-white/10 text-[10px] text-gray-200 px-2 py-1 rounded max-w-[180px] truncate focus:outline-none focus:border-cyan-500"
                >
                  {presetList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    if (butterchurnInstanceRef.current) {
                      const next = butterchurnInstanceRef.current.nextPreset();
                      setCurrentPresetName(next);
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
                  title="Next Preset"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* 2D / Character Stage Background Toggle Floating Overlay */}
          {(activeItem.id === 'dancing_man' || (isDualLayerEnabled && layer2Id === 'dancing_man')) && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setHideStageBackground(!hideStageBackground)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-xl backdrop-blur-md border ${
                  hideStageBackground
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-cyan-500/20'
                    : 'bg-black/70 border-white/20 text-gray-300 hover:text-white hover:bg-black/90'
                }`}
                title={t.stageBgHint}
              >
                <Sparkles size={13} className={hideStageBackground ? 'text-cyan-400' : 'text-yellow-400'} />
                <span>{hideStageBackground ? t.stageBgOff : t.stageBgOn}</span>
              </button>
            </div>
          )}

          {/* Stage Canvas Viewport */}
          <div 
            ref={containerRef}
            onMouseDown={(e) => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handlePointerDown(e.nativeEvent);
            }}
            onMouseMove={(e) => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handlePointerMove(e.nativeEvent);
            }}
            onMouseUp={() => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handlePointerUp();
            }}
            onTouchStart={(e) => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handlePointerDown(e.nativeEvent);
            }}
            onTouchMove={(e) => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handlePointerMove(e.nativeEvent);
            }}
            onTouchEnd={() => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handlePointerUp();
            }}
            onWheel={(e) => {
              if (activeItem.engine === 'three') threeInstanceRef.current?.handleWheel(e.nativeEvent);
            }}
            style={previewBW ? { filter: 'grayscale(100%) contrast(5000%) brightness(300%)' } : undefined}
            className={`flex-1 flex items-center justify-center overflow-hidden relative transition-all duration-300 ${
              activeItem.engine === 'three' ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            {/* Live B&W Matte Status Badge */}
            {previewBW && (
              <div className="absolute top-4 start-4 z-20 px-3 py-1 bg-black/80 border border-white/40 backdrop-blur-md rounded-full text-[10px] font-mono text-white flex items-center gap-2 shadow-2xl animate-pulse">
                <Contrast size={13} className="text-white" />
                <span>{t.bwMatteBadge}</span>
              </div>
            )}

            {/* 1. Base 2D & Video Remix Canvas */}
            <canvas 
              ref={canvas2DRef} 
              width={1280}
              height={720}
              className={`max-w-full max-h-full object-contain pointer-events-none ${(activeItem.engine === '2d' || activeItem.engine === 'video') ? 'block' : 'hidden'} ${bloomEffect ? 'filter drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]' : ''}`} 
            />

            {/* 2. Base Three.js WebGL Canvas */}
            <canvas 
              ref={canvasThreeRef} 
              width={1280}
              height={720}
              className={`max-w-full max-h-full object-contain ${activeItem.engine === 'three' ? 'block' : 'hidden'} ${bloomEffect ? 'filter drop-shadow-[0_0_20px_rgba(120,50,255,0.3)]' : ''}`} 
            />

            {/* 3. Base Butterchurn WebGL Canvas */}
            <canvas 
              ref={canvasButterchurnRef} 
              width={1280}
              height={720}
              className={`max-w-full max-h-full object-contain pointer-events-none ${activeItem.engine === 'butterchurn' ? 'block' : 'hidden'}`} 
            />

            {/* 4. Layer 2: 3D Spatial Overlay Canvas */}
            {isDualLayerEnabled && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
              >
                <canvas 
                  ref={canvasOverlay2DRef} 
                  width={1280}
                  height={720}
                  className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-75"
                  style={{
                    transform: `translate3d(${layerTransform.posX}%, ${layerTransform.posY}%, ${layerTransform.depthZ}px) rotateX(${layerTransform.rotateX}deg) rotateY(${layerTransform.rotateY}deg) rotateZ(${layerTransform.rotateZ}deg) scale(${layerTransform.scale * (layerTransform.beatReactivity && beatState.isBeat ? 1.08 + beatState.beatIntensity * 0.08 * Math.min(2.5, layer2Intensity) : 1)}) ${layerTransform.mirrorX ? 'scaleX(-1)' : ''}`,
                    mixBlendMode: layerTransform.blendMode === 'source-over' ? 'normal' : layerTransform.blendMode as any,
                    opacity: layerTransform.opacity,
                    filter: bloomEffect ? 'drop-shadow(0 0 18px rgba(0, 255, 255, 0.5))' : 'none'
                  }}
                />
              </div>
            )}

            {/* 5. Hidden Export Composite & B&W Matte Canvases */}
            <canvas ref={canvasExportCompositeRef} className="hidden pointer-events-none" />
            <canvas ref={canvasExportBWRef} className="hidden pointer-events-none" />
            
            {/* CRT Scanline Overlay FX */}
            {crtEffect && (
              <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-70" />
            )}

            {/* Drop Flash Glitch Overlay */}
            {glitchOnDrop && beatState.isDrop && (
              <div className="absolute inset-0 pointer-events-none z-15 bg-white/20 mix-blend-screen animate-ping" />
            )}

            {!audioUrl && !isMicActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 font-mono text-[11px] uppercase tracking-widest bg-black/60 backdrop-blur-sm pointer-events-none p-6 text-center gap-3">
                <p>[{t.selectAudioFirst}]</p>
                <div className="text-[10px] text-cyan-400 font-sans tracking-normal opacity-80">
                  {lang === 'he' ? '💡 טיפ: ניתן לטעון דמו בטאב "DSP & FX" או להפעיל מיקרופון חי' : '💡 Tip: Load a demo track from "DSP & FX" tab or enable Live Mic'}
                </div>
              </div>
            )}

            {/* Exporting Overlay */}
            {isExporting && (
              <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8 text-center">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-500 mb-2 animate-pulse tracking-widest uppercase">
                  {isCompressingZip 
                    ? (lang === 'he' ? 'דוחס ואורז תיקיית פרמים ל-ZIP...' : 'Packaging & Compressing Frames ZIP...')
                    : exportTarget === 'both'
                    ? (lang === 'he' ? 'מייצא וידיאו + רצף פרמים (ZIP)...' : 'Exporting Video + Frame Sequence (ZIP)...')
                    : exportTarget === 'frames'
                    ? (lang === 'he' ? 'מצלם ושומר פרמים (ZIP)...' : 'Capturing Frame Sequence...')
                    : exportPassMode === 'both' 
                    ? (lang === 'he' ? 'מייצא 2 עותקי וידיאו (צבע + שחור-לבן)...' : 'Exporting Dual Video (Color + B&W)...')
                    : exportPassMode === 'bw_matte'
                    ? (lang === 'he' ? 'מייצא וידיאו שחור-לבן ל-VJ...' : 'Exporting B&W Matte Video...')
                    : t.exporting}
                </div>
                
                <div className="text-xs text-gray-400 font-mono mb-6 flex items-center gap-3">
                  <span>{exportFps} FPS</span>
                  <span>•</span>
                  <span>{exportRes}</span>
                  <span>•</span>
                  <span>{exportAr}</span>
                  {(exportTarget === 'frames' || exportTarget === 'both') && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-300 font-bold">{capturedFramesCount} {lang === 'he' ? 'פרמים נלכדו' : 'frames'}</span>
                    </>
                  )}
                </div>

                {isCompressingZip ? (
                  <div className="w-full max-w-md space-y-2">
                    <div className="flex items-center justify-between text-xs text-indigo-300 font-mono">
                      <span className="flex items-center gap-1.5"><FolderArchive size={14} /> ZIP Archive</span>
                      <span>{zipProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-indigo-500/30 relative">
                      <div 
                        className="absolute h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-150" 
                        style={{ width: `${zipProgress}%` }} 
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-full max-w-md h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                      <div 
                        className="absolute h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 rounded-full transition-all duration-200" 
                        style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }} 
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between w-full max-w-md text-xs font-mono">
                      <span className="text-gray-400">{formatTime(currentTime)} / {formatTime(duration)}</span>
                      <span className="text-cyan-400 font-bold">{Math.round((currentTime / (duration || 1)) * 100 || 0)}%</span>
                    </div>
                  </>
                )}

                <button
                  onClick={stopExportManually}
                  className="mt-6 px-5 py-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <X size={14} />
                  <span>{lang === 'he' ? 'עצור ושמור תוצרים עכשיו' : 'Stop & Save Export Now'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Player Area with Synchronized Seeking & Transport */}
          <div className="h-24 border-t border-white/10 bg-[#121214] flex items-center px-4 sm:px-6 gap-3 sm:gap-5 shrink-0 z-10 select-none">
            
            {/* Play, Transport Seeking & Repeat Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <label 
                title={t.uploadTrack}
                className={`cursor-pointer p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5 ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Upload size={16} />
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" disabled={isExporting} />
              </label>

              {/* Jump to Beginning (0:00) */}
              <button
                onClick={() => seekTo(0)}
                disabled={!audioUrl || isExporting}
                title={lang === 'he' ? 'חזור להתחלה (Home)' : 'Restart to Beginning (Home)'}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5 disabled:opacity-30"
              >
                <SkipBack size={15} />
              </button>

              {/* Seek Backwards 5 seconds */}
              <button
                onClick={() => skipTime(-5)}
                disabled={!audioUrl || isExporting}
                title={lang === 'he' ? 'הזז 5 שניות אחורה (חץ שמאלה)' : 'Seek 5s Back (Left Arrow)'}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/5 flex items-center gap-0.5 disabled:opacity-30 text-[10px] font-mono font-bold"
              >
                <Rewind size={15} />
                <span className="hidden xl:inline">-5s</span>
              </button>

              {/* Main Play / Pause Button */}
              <button 
                onClick={togglePlay} 
                disabled={!audioUrl || isExporting}
                className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:hover:scale-100 shrink-0"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause size={20} className="fill-current text-white" /> : <Play size={20} className="fill-current text-white ml-0.5" />}
              </button>

              {/* Seek Forward 5 seconds */}
              <button
                onClick={() => skipTime(5)}
                disabled={!audioUrl || isExporting}
                title={lang === 'he' ? 'הזז 5 שניות קדימה (חץ ימינה)' : 'Seek 5s Forward (Right Arrow)'}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/5 flex items-center gap-0.5 disabled:opacity-30 text-[10px] font-mono font-bold"
              >
                <FastForward size={15} />
                <span className="hidden xl:inline">+5s</span>
              </button>

              {/* Repeat / Loop Button */}
              <button
                onClick={() => setIsLooping(!isLooping)}
                disabled={isExporting}
                title={isLooping ? t.repeatOn : t.repeatOff}
                className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all ${
                  isLooping 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20' 
                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                }`}
              >
                <Repeat size={14} className={isLooping ? 'animate-pulse' : ''} />
                <span className="text-[8px] sm:text-[9px] font-bold mt-0.5 tracking-tight">
                  {isLooping ? (lang === 'he' ? 'לופ פעיל' : 'LOOP') : (lang === 'he' ? 'לופ כבוי' : 'OFF')}
                </span>
              </button>
            </div>

            {/* Interactive WaveSurfer Drop & Synchronized Waveform Player */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <WaveformPlayer 
                audioUrl={audioUrl}
                audioRef={audioRef}
                currentTime={currentTime}
                duration={duration}
                isExporting={isExporting}
                lang={lang}
                onSeek={seekTo}
              />
              
              {/* Synchronized Precision Scrubber Slider */}
              {audioUrl && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    disabled={isExporting}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:bg-white/20 transition-all"
                    title={lang === 'he' ? 'גרור להזזת וידיאו ואודיו מסונכרנים' : 'Scrub synchronized video & audio'}
                  />
                  <div className="text-[10px] font-mono text-cyan-300 shrink-0 select-none">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
              )}
            </div>

            {/* Audio & Video Status Badge */}
            <div className="flex items-center gap-2 max-w-[140px] truncate shrink-0 hidden lg:flex">
              <FileAudio size={16} className="text-cyan-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-gray-300 font-mono truncate" title={audioFile?.name}>
                  {audioFile ? audioFile.name : (isMicActive ? 'MIC INPUT' : t.nowPlaying)}
                </span>
                {videoUrl && (
                  <span className="text-[8px] text-indigo-400 font-mono flex items-center gap-1">
                    <VideoIcon size={9} />
                    <span>{lang === 'he' ? 'וידאו מסונכרן' : 'Video Synced'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Export Settings */}
        <aside className="w-72 lg:w-80 border-s border-white/5 flex flex-col bg-[#121214] shrink-0">
          <div className="p-5 flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">
            
            {/* Export Mode Tabs: Standard vs. Advanced */}
            <div>
              <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl gap-1">
                <button
                  onClick={() => {
                    setExportTab('standard');
                    setExportTarget('video');
                    setExportPassMode('color');
                  }}
                  disabled={isExporting}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    exportTab === 'standard'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/25 font-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Film size={14} />
                  <span>{lang === 'he' ? 'שמירת וידאו' : 'Standard Video'}</span>
                </button>

                <button
                  onClick={() => setExportTab('advanced')}
                  disabled={isExporting}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    exportTab === 'advanced'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>{lang === 'he' ? 'מתקדם' : 'Advanced'}</span>
                </button>
              </div>

              <div className="text-[10px] text-gray-400 mt-2 px-1 leading-tight">
                {exportTab === 'standard' 
                  ? (lang === 'he' ? 'שמירה פשוטה וישירה של קובץ וידאו רגיל למחשב' : 'Simple, direct standard video export ready for playback')
                  : (lang === 'he' ? 'הגדרות מקצועיות: חבילות ZIP, רצף פרמים, מסכות שחור-לבן ל-VJ' : 'Professional options: ZIP frame sequences, B&W matte passes')}
              </div>
            </div>

            {/* TAB 1: STANDARD VIDEO EXPORT (Simple, clean, intuitive) */}
            {exportTab === 'standard' && (
              <div className="space-y-4">
                
                {/* Resolution */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block flex items-center gap-1.5">
                    <span>{t.resolution}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setExportRes('720p')}
                      disabled={isExporting}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                        exportRes === '720p'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>720p</div>
                      <div className="text-[8px] opacity-70 font-normal">HD</div>
                    </button>
                    <button
                      onClick={() => setExportRes('1080p')}
                      disabled={isExporting}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                        exportRes === '1080p'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>1080p</div>
                      <div className="text-[8px] text-cyan-400 font-normal">{lang === 'he' ? 'מומלץ' : 'Best'}</div>
                    </button>
                    <button
                      onClick={() => setExportRes('4k')}
                      disabled={isExporting}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                        exportRes === '4k'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>4K</div>
                      <div className="text-[8px] opacity-70 font-normal">UHD</div>
                    </button>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">
                    {t.aspectRatio}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setExportAr('16:9')}
                      disabled={isExporting}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                        exportAr === '16:9'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>16:9</div>
                      <div className="text-[8px] opacity-70 font-normal">{lang === 'he' ? 'רחב (YouTube)' : 'Widescreen'}</div>
                    </button>
                    <button
                      onClick={() => setExportAr('9:16')}
                      disabled={isExporting}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                        exportAr === '9:16'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>9:16</div>
                      <div className="text-[8px] opacity-70 font-normal">{lang === 'he' ? 'אנכי (Reels)' : 'Vertical'}</div>
                    </button>
                    <button
                      onClick={() => setExportAr('1:1')}
                      disabled={isExporting}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition-all ${
                        exportAr === '1:1'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>1:1</div>
                      <div className="text-[8px] opacity-70 font-normal">{lang === 'he' ? 'ריבוע' : 'Square'}</div>
                    </button>
                  </div>
                </div>

                {/* Video File Format (MP4 / WebM) */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">
                    {t.format}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportFormat('mp4')}
                      disabled={isExporting}
                      className={`py-2.5 px-2 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportFormat === 'mp4'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">MP4 Video</div>
                        <div className="text-[8px] opacity-70">{lang === 'he' ? 'תואם לכל מחשב וטלפון' : 'Universal standard'}</div>
                      </div>
                      {exportFormat === 'mp4' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                    </button>
                    <button
                      onClick={() => setExportFormat('webm')}
                      disabled={isExporting}
                      className={`py-2.5 px-2 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportFormat === 'webm'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">WebM (VP9)</div>
                        <div className="text-[8px] opacity-70">{lang === 'he' ? 'דחיסה מהירה' : 'Fast rendering'}</div>
                      </div>
                      {exportFormat === 'webm' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Standard Summary Card */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5 text-xs">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-cyan-400" />
                    <span>{lang === 'he' ? 'סיכום שמירה' : 'Export Summary'}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">{lang === 'he' ? 'סוג תוצר:' : 'Output:'}</span>
                    <span className="font-bold text-cyan-300">{exportRes} {exportFormat.toUpperCase()} ({exportAr})</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span className="text-gray-400">{lang === 'he' ? 'משך זמן:' : 'Duration:'}</span>
                    <span className="font-mono text-cyan-300">{formatTime(duration)}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 pt-1 border-t border-white/5 leading-tight">
                    {lang === 'he' 
                      ? 'הקובץ יישמר בתיקיית ההורדות במחשב שלך ומוכן ישירות להעלאה ולצפייה.' 
                      : 'File will be saved to your local downloads folder, ready for playback and uploading.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: ADVANCED EXPORT SETTINGS */}
            {exportTab === 'advanced' && (
              <div className="space-y-5">
                
                {/* Export Target (Video / Frames / Both) */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block flex items-center gap-1.5">
                    <FolderArchive size={13} className="text-indigo-400" />
                    <span>{t.exportTarget}</span>
                  </label>
                  
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setExportTarget('video')}
                      disabled={isExporting}
                      className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportTarget === 'video' 
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Film size={13} />
                          <span>{t.targetVideoOnly}</span>
                        </div>
                        <div className="text-[9px] opacity-70 mt-0.5">{lang === 'he' ? 'קובץ וידיאו יחיד (MP4 / WebM)' : 'Video file only'}</div>
                      </div>
                      {exportTarget === 'video' && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                    </button>

                    <button
                      onClick={() => setExportTarget('both')}
                      disabled={isExporting}
                      className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportTarget === 'both' 
                          ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border-cyan-500/50 text-cyan-200' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Film size={13} />
                          <span>+</span>
                          <FolderArchive size={13} />
                          <span>{t.targetBoth}</span>
                        </div>
                        <div className="text-[9px] opacity-70 mt-0.5">{lang === 'he' ? 'קובץ וידיאו + חבילת ZIP עם כל הפרמים' : 'Video file AND frame sequence ZIP'}</div>
                      </div>
                      {exportTarget === 'both' && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                    </button>

                    <button
                      onClick={() => setExportTarget('frames')}
                      disabled={isExporting}
                      className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportTarget === 'frames' 
                          ? 'bg-indigo-500/25 border-indigo-500/60 text-indigo-200' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <FolderArchive size={13} />
                          <span>{t.targetFramesOnly}</span>
                        </div>
                        <div className="text-[9px] opacity-70 mt-0.5">{lang === 'he' ? 'תיקיית ZIP של כל הפרמים כתמונות בדידות' : 'ZIP archive of standalone image sequence'}</div>
                      </div>
                      {exportTarget === 'frames' && <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Frame Image Format (if frames enabled) */}
                {(exportTarget === 'frames' || exportTarget === 'both') && (
                  <div className="p-3 bg-white/5 border border-indigo-500/30 rounded-xl space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold flex items-center gap-1.5">
                      <ImageIcon size={12} />
                      <span>{t.framesFormat}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setFramesFormat('png')}
                        disabled={isExporting}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                          framesFormat === 'png' 
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                        }`}
                      >
                        PNG ({lang === 'he' ? 'איכות מקסימלית' : 'Lossless'})
                      </button>
                      <button
                        onClick={() => setFramesFormat('jpeg')}
                        disabled={isExporting}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                          framesFormat === 'jpeg' 
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                            : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                        }`}
                      >
                        JPEG ({lang === 'he' ? 'דחיסה מהירה' : 'Fast / 95%'})
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolution & FPS */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">{t.exportSettings}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1.5">{t.resolution}</div>
                      <select value={exportRes} onChange={e => setExportRes(e.target.value as any)} className="w-full bg-transparent text-xs font-bold focus:outline-none" disabled={isExporting}>
                        <option className="bg-[#1A1A1D]" value="720p">720p HD</option>
                        <option className="bg-[#1A1A1D]" value="1080p">1080p (FHD)</option>
                        <option className="bg-[#1A1A1D]" value="4k">4K (UHD)</option>
                      </select>
                    </div>
                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg">
                      <div className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mb-1.5">{t.fps}</div>
                      <select value={exportFps} onChange={e => setExportFps(Number(e.target.value))} className="w-full bg-transparent text-xs font-bold focus:outline-none cursor-pointer" disabled={isExporting}>
                        <option className="bg-[#1A1A1D]" value={12}>12 FPS ({lang === 'he' ? 'רטרו/סטופ-מושן' : 'Lo-Fi'})</option>
                        <option className="bg-[#1A1A1D]" value={24}>24 FPS ({lang === 'he' ? 'קולנועי' : 'Cinema'})</option>
                        <option className="bg-[#1A1A1D]" value={30}>30 FPS ({lang === 'he' ? 'רגיל' : 'Standard'})</option>
                        <option className="bg-[#1A1A1D]" value={60}>60 FPS ({lang === 'he' ? 'חלק ומהיר' : 'Smooth'})</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">{t.aspectRatio}</label>
                  <div className="flex gap-2">
                    <button onClick={() => setExportAr('16:9')} disabled={isExporting} className={`flex-1 py-2 text-[10px] rounded-lg font-bold transition-all ${exportAr === '16:9' ? 'bg-indigo-500/25 border border-indigo-500/60 text-indigo-300' : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100'}`}>16:9</button>
                    <button onClick={() => setExportAr('9:16')} disabled={isExporting} className={`flex-1 py-2 text-[10px] rounded-lg font-bold transition-all ${exportAr === '9:16' ? 'bg-indigo-500/25 border border-indigo-500/60 text-indigo-300' : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100'}`}>9:16</button>
                    <button onClick={() => setExportAr('1:1')} disabled={isExporting} className={`flex-1 py-2 text-[10px] rounded-lg font-bold transition-all ${exportAr === '1:1' ? 'bg-indigo-500/25 border border-indigo-500/60 text-indigo-300' : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100'}`}>1:1</button>
                  </div>
                </div>

                {/* Color & B&W Matte Pass Mode */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">{t.exportPassMode}</label>
                    <button
                      onClick={() => setPreviewBW(!previewBW)}
                      title={t.bwPreviewToggle}
                      className={`text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 border transition-all ${
                        previewBW 
                          ? 'bg-white text-black border-white font-bold shadow-sm shadow-white/40' 
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Contrast size={11} />
                      <span>{t.bwPreviewToggle}</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setExportPassMode('color')}
                      disabled={isExporting}
                      className={`p-2 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportPassMode === 'color' 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{t.passColorOnly}</div>
                        <div className="text-[8px] opacity-70">{lang === 'he' ? 'ייצוא רגיל בצבעים חיים' : 'Original vivid colors'}</div>
                      </div>
                      {exportPassMode === 'color' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                    </button>

                    <button
                      onClick={() => setExportPassMode('bw_matte')}
                      disabled={isExporting}
                      className={`p-2 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportPassMode === 'bw_matte' 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <Contrast size={12} className="text-white" />
                          <span>{t.passBwOnly}</span>
                        </div>
                        <div className="text-[8px] opacity-70">{lang === 'he' ? 'אלמנטים בלבן טהור, רקע שחור מלא' : 'White on black matte for VJ'}</div>
                      </div>
                      {exportPassMode === 'bw_matte' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                    </button>

                    <button
                      onClick={() => setExportPassMode('both')}
                      disabled={isExporting}
                      className={`p-2 rounded-lg border text-start flex items-center justify-between transition-all ${
                        exportPassMode === 'both' 
                          ? 'bg-indigo-500/25 border-indigo-500/60 text-indigo-200' 
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-indigo-300">{t.passBoth}</div>
                        <div className="text-[8px] opacity-70">{lang === 'he' ? 'מייצר 2 עותקים: צבע + עותק שחור-לבן' : 'Exports 2 copies: Color + B&W Copy'}</div>
                      </div>
                      {exportPassMode === 'both' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                    </button>
                  </div>
                </div>

                {/* Video File Format in Advanced */}
                {(exportTarget === 'video' || exportTarget === 'both') && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 block">{t.format}</label>
                    <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)} className="w-full bg-[#1A1A1D] border border-white/10 p-2 rounded text-xs focus:outline-none focus:border-cyan-500 transition-colors" disabled={isExporting}>
                      <option value="mp4">MP4 Video</option>
                      <option value="webm">WebM (High Performance VP9)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Export Action Area */}
            <div className="pt-4 border-t border-white/10 mt-auto select-none">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="opacity-50 text-[11px]">{t.time}</span>
                <span className="font-mono text-cyan-400 font-bold">{formatTime(duration)}</span>
              </div>
              
              <button 
                onClick={startExport} 
                disabled={!audioUrl || isExporting}
                className={`w-full py-3.5 rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all flex items-center justify-center gap-2 ${
                  !audioUrl || isExporting 
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' 
                    : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-600 text-white shadow-xl shadow-indigo-600/30 hover:brightness-110 active:scale-95'
                }`}
              >
                {isExporting ? (
                  <span>{t.exporting.toUpperCase()}</span>
                ) : exportTab === 'standard' ? (
                  <>
                    <Film size={16} />
                    <span>{lang === 'he' ? `ייצא וידאו (${exportRes} ${exportFormat.toUpperCase()})` : `SAVE VIDEO (${exportRes} ${exportFormat.toUpperCase()})`}</span>
                  </>
                ) : exportTarget === 'both' ? (
                  <>
                    <Film size={15} />
                    <span>+</span>
                    <FolderArchive size={15} />
                    <span>{lang === 'he' ? 'ייצא וידיאו + פרמים (ZIP)' : 'EXPORT VIDEO + FRAMES (ZIP)'}</span>
                  </>
                ) : exportTarget === 'frames' ? (
                  <>
                    <FolderArchive size={15} />
                    <span>{lang === 'he' ? 'ייצא רצף פרמים (ZIP)' : 'EXPORT FRAMES (ZIP)'}</span>
                  </>
                ) : (
                  <>
                    <Film size={15} />
                    <span>{t.exportBtn.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-black/30 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-cyan-400" />
              <span>Three.js + Milkdrop + DSP EQ</span>
            </div>
            <span className="font-mono">v6.0</span>
          </div>
        </aside>

      </main>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#16161A] border border-white/15 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <HelpCircle size={16} />
                {t.shortcutsTitle}
              </h3>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{t.shortcutsPlay}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">Space</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{t.shortcutsLoop}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">L</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{t.shortcutsRandom}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">R</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{t.shortcutsFullscreen}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">F</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{t.shortcutsMic}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">M</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{lang === 'he' ? 'קפיצה 5 שניות קדימה / אחורה' : 'Seek +/- 5 Seconds'}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">← / →</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{lang === 'he' ? 'חזרה להתחלה' : 'Restart from Beginning'}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">Home</kbd>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span className="text-gray-300">{lang === 'he' ? 'עדכון מהיר מ-GitHub' : 'Quick GitHub Update'}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-[10px] text-cyan-300">Y</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs transition-colors"
            >
              {t.shortcutsClose}
            </button>
          </div>
        </div>
      )}

      {/* Floating Update Notification Toast / Banner */}
      {hasNewGitHubUpdate && !showGitHubModal && (
        <div className="fixed bottom-20 start-6 z-40 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="p-3 bg-[#14141c]/95 border border-cyan-500/50 backdrop-blur-md rounded-2xl shadow-2xl shadow-cyan-500/20 flex items-center gap-3 text-xs text-white max-w-sm">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold shrink-0 animate-pulse">
              Y
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={13} className="text-yellow-400" />
                <span>{lang === 'he' ? 'קיים עדכון חדש לפרויקט!' : 'New Update Available!'}</span>
              </div>
              <div className="text-[10px] text-gray-300 truncate">
                {lang === 'he' ? 'לחץ על [Y] לעדכון מהיר' : 'Press [Y] key to update'}
              </div>
            </div>
            <button
              onClick={() => setShowGitHubModal(true)}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-lg text-[11px] shadow-sm transition-all cursor-pointer shrink-0"
            >
              {lang === 'he' ? 'עדכן [Y]' : 'Update [Y]'}
            </button>
            <button
              onClick={() => setHasNewGitHubUpdate(false)}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Quick feedback toast when pressing Y */}
      {showUpdateToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-150">
          <div className="px-4 py-2 bg-cyan-500 text-black font-black text-xs rounded-full shadow-2xl flex items-center gap-2">
            <Zap size={14} className="fill-current" />
            <span>{lang === 'he' ? '🚀 פקודת העדכון הועתקה! פותח חלון עדכון...' : '🚀 Update command copied! Opening updater...'}</span>
          </div>
        </div>
      )}

      {/* GitHub Sync & 1-Click Update Modal */}
      <GitHubUpdateModal 
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        lang={lang}
        onUpdateDetected={(hasUpdate, commit) => {
          setHasNewGitHubUpdate(hasUpdate);
          if (commit) setLatestCommitInfo(commit);
        }}
      />

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          crossOrigin="anonymous"
          loop={!isExporting && isLooping}
          onLoadedData={handleAudioLoad}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      {/* Hidden Video Element for Video Remix & Speed Modulation */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          playsInline
          muted
          loop={videoRemixSettings.endBehavior === 'loop_video' || (!isExporting && isLooping)}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              });
              setVideoDuration(videoRef.current.duration);
            }
          }}
          className="hidden"
        />
      )}
    </div>
  );
}
