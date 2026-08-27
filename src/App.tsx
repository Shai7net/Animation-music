import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Upload, Settings, Monitor, Film, Download, FileAudio, 
  Sparkles, Compass, RotateCcw, Shuffle, ChevronRight, ChevronLeft, Box,
  Layers, Volume2, Maximize2, Repeat, Sliders, Palette, Zap, Radio,
  Activity, HelpCircle, X, Contrast, GitBranch
} from 'lucide-react';
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

export type CategoryFilter = 'all' | 'three' | 'butterchurn' | '2d';

interface UnifiedVisualizer {
  id: string;
  nameEn: string;
  nameHe: string;
  engine: '2d' | 'three' | 'butterchurn';
  threeType?: 'cyber_city' | 'galaxy' | 'monolith' | 'synthwave_horizon' | 'hyperdrive_tunnel' | 'liquid_blob';
  badge?: string;
}

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
  const [activeSidebarTab, setActiveSidebarTab] = useState<'styles' | 'dual' | 'fx'>('styles');
  
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

  // Export Settings
  const [exportRes, setExportRes] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [exportAr, setExportAr] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [exportFps, setExportFps] = useState<number>(30);
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp4'>('webm');
  const [exportPassMode, setExportPassMode] = useState<'color' | 'bw_matte' | 'both'>('color');
  const [previewBW, setPreviewBW] = useState<boolean>(false);
  const [hideStageBackground, setHideStageBackground] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [intensity, setIntensity] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(true);

  // Live DSP Beat & Band State for UI
  const [beatState, setBeatState] = useState<BeatState>({
    isBeat: false,
    isDrop: false,
    beatIntensity: 0,
    bpm: 128,
    vuLevel: 0
  });
  const [bands, setBands] = useState<AudioBands>({
    subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, overallEnergy: 0
  });

  const t = i18n[lang];

  const audioRef = useRef<HTMLAudioElement>(null);
  
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

  const effectiveBaseItem = isDualLayerEnabled
    ? (allUnifiedVisualizers.find(v => v.id === layer1Id) || allUnifiedVisualizers[0])
    : (allUnifiedVisualizers.find(v => v.id === activeStyleId) || allUnifiedVisualizers[0]);

  const activeItem = effectiveBaseItem;

  // Helper to resize all canvases
  const updateCanvasSizes = useCallback(() => {
    let baseH = 720;
    if (exportRes === '1080p') baseH = 1080;
    if (exportRes === '4k') baseH = 2160;
    
    let w = 1280;
    let h = 720;
    
    if (exportAr === '16:9') { w = Math.round(baseH * 16/9); h = baseH; }
    else if (exportAr === '9:16') { w = Math.round(baseH * 9/16); h = baseH; }
    else if (exportAr === '1:1') { w = baseH; h = baseH; }
    
    [
      canvas2DRef.current, 
      canvasThreeRef.current, 
      canvasButterchurnRef.current,
      canvasOverlay2DRef.current,
      canvasExportCompositeRef.current,
      canvasExportBWRef.current
    ].forEach(c => {
      if (c) {
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
  }, [exportRes, exportAr]);

  useEffect(() => {
    if (!isExporting) {
      updateCanvasSizes();
    }
  }, [updateCanvasSizes, isExporting]);

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
        threeInstanceRef.current.destroy();
        threeInstanceRef.current = null;
      }

      updateCanvasSizes();

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
    } else {
      if (threeInstanceRef.current) {
        threeInstanceRef.current.destroy();
        threeInstanceRef.current = null;
      }
    }
  }, [activeStyleId, isDualLayerEnabled, layer1Id, updateCanvasSizes]);

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
    const isLive = isExportingRef.current || isPlayingRef.current || isMicActive;
    
    if (isLive) {
      const dsp = audioEngineRef.current.analyze();
      setBeatState(dsp.beat);
      setBands(dsp.bands);

      const masterInt = intensityRef.current;
      const rawFreq = audioEngineRef.current.freqData;
      const rawTime = audioEngineRef.current.timeData;

      const isDual = isDualLayerEnabledRef.current;
      const l1Sensitivity = isDual ? (layer1IntensityRef.current || 1.0) : 1.0;
      const l2Sensitivity = isDual ? (layer2IntensityRef.current || 1.2) : 1.0;

      const int1 = masterInt * l1Sensitivity;
      const int2 = masterInt * l2Sensitivity;

      // Scaled audio data for Layer 1
      const scaledFreq1 = new Uint8Array(rawFreq.length);
      const scaledTime1 = new Uint8Array(rawTime.length);
      for (let i = 0; i < rawFreq.length; i++) {
        scaledFreq1[i] = Math.min(255, rawFreq[i] * int1);
        const tDiff = rawTime[i] - 128;
        scaledTime1[i] = Math.max(0, Math.min(255, 128 + tDiff * int1));
      }

      // Scaled audio data for Layer 2 (when Dual Layer is enabled)
      const scaledFreq2 = new Uint8Array(rawFreq.length);
      const scaledTime2 = new Uint8Array(rawTime.length);
      if (isDual) {
        for (let i = 0; i < rawFreq.length; i++) {
          scaledFreq2[i] = Math.min(255, rawFreq[i] * int2);
          const tDiff = rawTime[i] - 128;
          scaledTime2[i] = Math.max(0, Math.min(255, 128 + tDiff * int2));
        }
      }

      const baseItem = isDual 
        ? (allUnifiedVisualizers.find(v => v.id === layer1IdRef.current) || allUnifiedVisualizers[0])
        : (allUnifiedVisualizers.find(v => v.id === activeStyleIdRef.current) || allUnifiedVisualizers[0]);

      // 1. Three.js Engine (Base Layer 1)
      if (baseItem.engine === 'three' && threeInstanceRef.current) {
        threeInstanceRef.current.update(scaledFreq1, scaledTime1, time, int1);
      }
      // 2. Butterchurn Engine (Base Layer 1)
      else if (baseItem.engine === 'butterchurn' && butterchurnInstanceRef.current) {
        butterchurnInstanceRef.current.render();
      }
      // 3. 2D Canvas Engine (Base Layer 1)
      else if (baseItem.engine === '2d' && canvas2DRef.current) {
        const ctx = canvas2DRef.current.getContext('2d');
        if (ctx) {
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
        }
      }

      // 4. Overlay Layer Engine (Layer 2 with independent sensitivity)
      if (isDual && canvasOverlay2DRef.current) {
        const ctxOverlay = canvasOverlay2DRef.current.getContext('2d');
        if (ctxOverlay) {
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
        }
      }
    }

    reqRef.current = requestAnimationFrame(loop);
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

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;
    const ctx = audioEngineRef.current.getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, activeItem.engine]);

  // Video Export (Supports 12 FPS, 24 FPS, 30 FPS, 60 FPS, Color & Pure B&W Matte Pass)
  const startExport = async () => {
    if (!audioRef.current) return;
    
    const compCanvas = canvasExportCompositeRef.current;
    const bwCanvas = canvasExportBWRef.current;
    if (!compCanvas || !bwCanvas) return;

    setIsExporting(true);
    setIsPlaying(true);
    updateCanvasSizes();
    
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

    const handleDownload = (blob: Blob, suffix: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RetroViz_${activeItem.id}_${suffix}_${timestamp}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
    };

    const mode = exportPassModeRef.current;
    const shouldExportColor = mode === 'color' || mode === 'both';
    const shouldExportBW = mode === 'bw_matte' || mode === 'both';

    let finishedCount = 0;
    const totalRecorders = mode === 'both' ? 2 : 1;

    const checkAllFinished = () => {
      finishedCount++;
      if (finishedCount >= totalRecorders) {
        setIsExporting(false);
        setIsPlaying(false);
        if (analyser) {
          try { analyser.disconnect(dest); } catch(e) {}
        }
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
        handleDownload(blob, mode === 'both' ? 'Color' : 'Video');
        checkAllFinished();
      };
      recColor.start();
    }

    // 2. Pure B&W Matte Pass (Pure white elements on pitch black 0x000000 background)
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
        handleDownload(blob, 'BW_Matte');
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
      setIsPlaying(false);
      if (mediaRecorderColorRef.current && mediaRecorderColorRef.current.state !== 'inactive') {
        mediaRecorderColorRef.current.stop();
      }
      if (mediaRecorderBWRef.current && mediaRecorderBWRef.current.state !== 'inactive') {
        mediaRecorderBWRef.current.stop();
      }
    }
  };

  const handleAudioEnded = () => {
    if (isExportingRef.current) {
      setIsPlaying(false);
      if (mediaRecorderColorRef.current && mediaRecorderColorRef.current.state !== 'inactive') {
        mediaRecorderColorRef.current.stop();
      }
      if (mediaRecorderBWRef.current && mediaRecorderBWRef.current.state !== 'inactive') {
        mediaRecorderBWRef.current.stop();
      }
    } else if (isLoopingRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.warn('Loop playback error:', e));
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
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
    if (categoryFilter === 'three') return v.engine === 'three';
    if (categoryFilter === 'butterchurn') return v.engine === 'butterchurn';
    if (categoryFilter === '2d') return v.engine === '2d';
    return true;
  });

  const dir = lang === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className={`h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans selection:bg-cyan-500 selection:text-white flex flex-col overflow-hidden ${lang === 'he' ? 'text-right' : 'text-left'}`}>
      
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#121214] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Monitor size={18} className="text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-indigo-300">
              {t.title}
            </h1>
            <span className="text-xs opacity-50 font-normal hidden sm:inline">{t.subtitle}</span>
          </div>
        </div>

        {/* VJ Real-time HUD, GitHub Sync & Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowGitHubModal(true)}
            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm group"
            title={t.githubSyncTooltip}
          >
            <GitBranch size={13} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden md:inline">{t.githubSyncBtn}</span>
            <span className="md:hidden">GitHub</span>
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
        
        {/* Left Sidebar: Styles & Engines / Dual Layer 3D / Audio FX */}
        <aside className="w-72 lg:w-80 border-e border-white/5 flex flex-col bg-[#121214] shrink-0">
          
          {/* Top Tabs: Visualizers vs Dual Layer vs Audio FX */}
          <div className="grid grid-cols-3 p-1.5 border-b border-white/5 bg-black/40 shrink-0 gap-1">
            <button
              onClick={() => setActiveSidebarTab('styles')}
              className={`py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all truncate ${
                activeSidebarTab === 'styles'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film size={13} className="shrink-0" />
              <span className="truncate">{t.styles}</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('dual')}
              className={`py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all truncate relative ${
                activeSidebarTab === 'dual'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-black font-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={13} className="shrink-0" />
              <span className="truncate">{t.dualLayerTab || (lang === 'he' ? 'שכבות (3D)' : 'Dual (3D)')}</span>
              {isDualLayerEnabled && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab('fx')}
              className={`py-2 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all truncate ${
                activeSidebarTab === 'fx'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders size={13} className="shrink-0" />
              <span className="truncate">{lang === 'he' ? 'עיבוד ו-FX' : 'DSP & FX'}</span>
            </button>
          </div>

          {activeSidebarTab === 'styles' ? (
            <>
              {/* Category Filter Tabs */}
              <div className="p-3 border-b border-white/5 bg-black/20 shrink-0">
                <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-lg text-[10px] font-bold">
                  <button 
                    onClick={() => setCategoryFilter('all')}
                    className={`py-1.5 rounded transition-all ${categoryFilter === 'all' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    {lang === 'he' ? 'הכל' : 'All'}
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('three')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-1 ${categoryFilter === 'three' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Box size={11} />
                    3D
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('butterchurn')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-1 ${categoryFilter === 'butterchurn' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Sparkles size={11} />
                    Milkdrop
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('2d')}
                    className={`py-1.5 rounded transition-all flex items-center justify-center gap-1 ${categoryFilter === '2d' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Layers size={11} />
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
                          v.engine === 'three' ? 'bg-indigo-400' : v.engine === 'butterchurn' ? 'bg-fuchsia-400' : 'bg-cyan-400'
                        }`} />
                        <span className="text-xs font-medium truncate">{lang === 'en' ? v.nameEn : v.nameHe}</span>
                      </div>
                      {v.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
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
            ) : (
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

            {/* 1. Base 2D Canvas */}
            <canvas 
              ref={canvas2DRef} 
              className={`max-w-full max-h-full object-contain pointer-events-none ${activeItem.engine === '2d' ? 'block' : 'hidden'} ${bloomEffect ? 'filter drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]' : ''}`} 
            />

            {/* 2. Base Three.js WebGL Canvas */}
            <canvas 
              ref={canvasThreeRef} 
              className={`max-w-full max-h-full object-contain ${activeItem.engine === 'three' ? 'block' : 'hidden'} ${bloomEffect ? 'filter drop-shadow-[0_0_20px_rgba(120,50,255,0.3)]' : ''}`} 
            />

            {/* 3. Base Butterchurn WebGL Canvas */}
            <canvas 
              ref={canvasButterchurnRef} 
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
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8 text-center">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-500 mb-2 animate-pulse tracking-widest uppercase">
                  {exportPassMode === 'both' 
                    ? (lang === 'he' ? 'מייצא 2 עותקים (צבע + שחור-לבן)...' : 'Exporting Dual (Color + B&W Copy)...')
                    : exportPassMode === 'bw_matte'
                    ? (lang === 'he' ? 'מייצא עותק שחור-לבן ל-VJ...' : 'Exporting B&W Matte...')
                    : t.exporting}
                </div>
                <div className="text-xs text-gray-400 font-mono mb-6">
                  {exportFps} FPS • {exportRes} • {exportAr}
                </div>
                <div className="w-full max-w-md h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                  <div 
                    className="absolute h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300" 
                    style={{ width: `${(currentTime / (duration || 1)) * 100 || 0}%` }} 
                  />
                </div>
                <div className="mt-4 text-cyan-400 font-mono text-sm">{Math.round((currentTime / (duration || 1)) * 100 || 0)}%</div>
                <button
                  onClick={stopExportManually}
                  className="mt-6 px-5 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-bold transition-colors"
                >
                  {lang === 'he' ? 'בטל / עצור ייצוא עכשיו' : 'Stop / Save Export Now'}
                </button>
              </div>
            )}
          </div>

          {/* Bottom Player Area with WaveSurfer */}
          <div className="h-24 border-t border-white/5 bg-[#121214] flex items-center px-6 gap-6 shrink-0 z-10">
            
            {/* Play, Repeat & Upload Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <label 
                title={t.uploadTrack}
                className={`cursor-pointer p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5 ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Upload size={18} />
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" disabled={isExporting} />
              </label>

              <button 
                onClick={togglePlay} 
                disabled={!audioUrl || isExporting}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:hover:scale-100"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={22} className="fill-current text-white" /> : <Play size={22} className="fill-current text-white ml-0.5" />}
              </button>

              {/* Repeat / Loop Button */}
              <button
                onClick={() => setIsLooping(!isLooping)}
                disabled={isExporting}
                title={isLooping ? t.repeatOn : t.repeatOff}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                  isLooping 
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20' 
                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                }`}
              >
                <Repeat size={16} className={isLooping ? 'animate-pulse' : ''} />
                <span className="text-[9px] font-bold mt-0.5 tracking-tight">
                  {isLooping ? (lang === 'he' ? 'ריפיט פעיל' : 'LOOP ON') : (lang === 'he' ? 'ריפיט כבוי' : 'LOOP OFF')}
                </span>
              </button>
            </div>

            {/* Interactive WaveSurfer Drop & Waveform Player */}
            <WaveformPlayer 
              audioUrl={audioUrl}
              audioRef={audioRef}
              currentTime={currentTime}
              duration={duration}
              isExporting={isExporting}
              lang={lang}
            />

            {/* Audio File Name */}
            <div className="flex items-center gap-2 max-w-[140px] truncate shrink-0 hidden lg:flex">
              <FileAudio size={16} className="text-gray-500 shrink-0" />
              <span className="text-[10px] text-gray-400 font-mono truncate" title={audioFile?.name}>
                {audioFile ? audioFile.name : (isMicActive ? 'MIC INPUT' : t.nowPlaying)}
              </span>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Export Settings */}
        <aside className="w-72 lg:w-80 border-s border-white/5 flex flex-col bg-[#121214] shrink-0">
          <div className="p-6 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
            
            {/* Resolution & FPS (Supports 12 FPS Lo-Fi / Stop Motion) */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 block">{t.exportSettings}</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t.resolution}</div>
                  <select value={exportRes} onChange={e => setExportRes(e.target.value as any)} className="w-full bg-transparent text-xs font-bold focus:outline-none" disabled={isExporting}>
                    <option className="bg-[#1A1A1D]" value="720p">720p</option>
                    <option className="bg-[#1A1A1D]" value="1080p">1080p (FHD)</option>
                    <option className="bg-[#1A1A1D]" value="4k">4K (UHD)</option>
                  </select>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t.fps}</div>
                  <select value={exportFps} onChange={e => setExportFps(Number(e.target.value))} className="w-full bg-transparent text-xs font-bold focus:outline-none cursor-pointer" disabled={isExporting}>
                    <option className="bg-[#1A1A1D]" value={12}>12 FPS ({lang === 'he' ? 'רטרו / סטופ-מושן' : 'Lo-Fi / Retro'})</option>
                    <option className="bg-[#1A1A1D]" value={24}>24 FPS ({lang === 'he' ? 'קולנועי' : 'Cinema'})</option>
                    <option className="bg-[#1A1A1D]" value={30}>30 FPS ({lang === 'he' ? 'סטנדרטי' : 'Standard'})</option>
                    <option className="bg-[#1A1A1D]" value={60}>60 FPS ({lang === 'he' ? 'חלק ומהיר' : 'Smooth'})</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 block">{t.aspectRatio}</label>
              <div className="flex gap-2">
                <button onClick={() => setExportAr('16:9')} disabled={isExporting} className={`flex-1 py-2.5 text-[10px] rounded-lg font-bold transition-all ${exportAr === '16:9' ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300' : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100'}`}>16:9</button>
                <button onClick={() => setExportAr('9:16')} disabled={isExporting} className={`flex-1 py-2.5 text-[10px] rounded-lg font-bold transition-all ${exportAr === '9:16' ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300' : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100'}`}>9:16 (Reels)</button>
                <button onClick={() => setExportAr('1:1')} disabled={isExporting} className={`flex-1 py-2.5 text-[10px] rounded-lg font-bold transition-all ${exportAr === '1:1' ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300' : 'bg-white/5 border border-white/5 opacity-60 hover:opacity-100'}`}>1:1</button>
              </div>
            </div>

            {/* Color & B&W Matte Pass Mode (Full Color, B&W Matte, or Dual Copy) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">{t.exportPassMode}</label>
                <button
                  onClick={() => setPreviewBW(!previewBW)}
                  title={t.bwPreviewToggle}
                  className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 border transition-all ${
                    previewBW 
                      ? 'bg-white text-black border-white font-bold shadow-sm shadow-white/40' 
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Contrast size={12} />
                  <span>{t.bwPreviewToggle}</span>
                </button>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setExportPassMode('color')}
                  disabled={isExporting}
                  className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
                    exportPassMode === 'color' 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' 
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{t.passColorOnly}</div>
                    <div className="text-[9px] opacity-70">{lang === 'he' ? 'ייצוא רגיל בצבעים חיים' : 'Original vivid colors'}</div>
                  </div>
                  {exportPassMode === 'color' && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                </button>

                <button
                  onClick={() => setExportPassMode('bw_matte')}
                  disabled={isExporting}
                  className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
                    exportPassMode === 'bw_matte' 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' 
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Contrast size={13} className="text-white" />
                      <span>{t.passBwOnly}</span>
                    </div>
                    <div className="text-[9px] opacity-70">{lang === 'he' ? 'אלמנטים בלבן טהור, רקע שחור מלא' : 'White elements on #000000 black'}</div>
                  </div>
                  {exportPassMode === 'bw_matte' && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                </button>

                <button
                  onClick={() => setExportPassMode('both')}
                  disabled={isExporting}
                  className={`p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
                    exportPassMode === 'both' 
                      ? 'bg-indigo-500/25 border-indigo-500/60 text-indigo-200' 
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-indigo-300">{t.passBoth}</div>
                    <div className="text-[9px] opacity-70">{lang === 'he' ? 'מייצר 2 קבצים: צבע מקורי + עותק שחור-לבן' : 'Exports 2 files: Full Color + B&W Copy'}</div>
                  </div>
                  {exportPassMode === 'both' && <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
                </button>
              </div>

              <p className="mt-2 text-[9px] text-gray-500 leading-tight">
                {t.bwMatteHint}
              </p>
            </div>

            {/* Video File Format */}
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3 block">{t.format}</label>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)} className="w-full bg-[#1A1A1D] border border-white/10 p-2.5 rounded text-xs focus:outline-none focus:border-cyan-500 transition-colors" disabled={isExporting}>
                <option value="webm">WebM (High Performance VP9)</option>
                <option value="mp4">MP4 Video</option>
              </select>
              <p className="mt-2 text-[9px] text-gray-500 leading-tight">{t.supportedWarning}</p>
            </div>

            <div className="pt-4 border-t border-white/5 mt-auto">
              <div className="flex items-center justify-between text-xs mb-6">
                <span className="opacity-50">{t.time}</span>
                <span className="font-mono text-cyan-400">{formatTime(duration)}</span>
              </div>
              
              <button 
                onClick={startExport} 
                disabled={!audioUrl || isExporting}
                className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all ${
                  !audioUrl || isExporting 
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10' 
                    : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-600 text-white shadow-xl shadow-indigo-600/30 hover:brightness-110 active:scale-95'
                }`}
              >
                {isExporting ? t.exporting.toUpperCase() : t.exportBtn.toUpperCase()}
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

      {/* GitHub Sync & 1-Click Update Modal */}
      <GitHubUpdateModal 
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        lang={lang}
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
    </div>
  );
}
