import React from 'react';
import { 
  Layers, Move, Maximize2, Rotate3d, Compass, Eye, Sparkles, 
  Check, RefreshCw, Box, Sliders, ArrowUpRight, Grid, Zap, FlipHorizontal
} from 'lucide-react';
import { Language } from '../i18n';

export interface LayerTransform {
  posX: number;       // -100 to +100 (%)
  posY: number;       // -100 to +100 (%)
  scale: number;      // 0.2 to 2.5
  rotateX: number;    // -80 to +80 (deg, tilt up/down)
  rotateY: number;    // -80 to +80 (deg, rotate left/right)
  rotateZ: number;    // -180 to +180 (deg, 2D rotation)
  depthZ: number;     // -500 to +500 (px, 3D depth into / out of video)
  opacity: number;    // 0.1 to 1.0
  blendMode: 'screen' | 'source-over' | 'lighten' | 'color-dodge' | 'overlay' | 'hard-light';
  beatReactivity: boolean;
  mirrorX: boolean;
  transparentBg: boolean;
  hideStageBg: boolean;
}

export const defaultLayerTransform: LayerTransform = {
  posX: 0,
  posY: 5,
  scale: 0.95,
  rotateX: 12,
  rotateY: 0,
  rotateZ: 0,
  depthZ: 40,
  opacity: 1.0,
  blendMode: 'screen',
  beatReactivity: true,
  mirrorX: false,
  transparentBg: true,
  hideStageBg: false,
};

export interface SpatialPreset {
  id: string;
  nameEn: string;
  nameHe: string;
  transform: Partial<LayerTransform>;
}

export const spatialPresets: SpatialPreset[] = [
  {
    id: 'stage_center_3d',
    nameEn: '3D Stage Center',
    nameHe: 'מרכז במה תלת-ממד',
    transform: {
      posX: 0,
      posY: 10,
      scale: 1.0,
      rotateX: 15,
      rotateY: 0,
      rotateZ: 0,
      depthZ: 60,
      blendMode: 'screen',
      beatReactivity: true,
    }
  },
  {
    id: 'deep_tunnel_3d',
    nameEn: 'Deep 3D Tunnel Depth',
    nameHe: 'עומק מנהרה פנימי',
    transform: {
      posX: 0,
      posY: 0,
      scale: 0.65,
      rotateX: -10,
      rotateY: 25,
      rotateZ: -5,
      depthZ: -220,
      blendMode: 'screen',
      beatReactivity: true,
    }
  },
  {
    id: 'floating_hologram',
    nameEn: 'Floating Hologram',
    nameHe: 'הולוגרמה מרחפת',
    transform: {
      posX: 0,
      posY: -15,
      scale: 0.85,
      rotateX: 25,
      rotateY: -20,
      rotateZ: 8,
      depthZ: 140,
      blendMode: 'color-dodge',
      beatReactivity: true,
    }
  },
  {
    id: 'dj_corner_right',
    nameEn: 'DJ Stage Corner',
    nameHe: 'פינת DJ ימנית',
    transform: {
      posX: 45,
      posY: 22,
      scale: 0.7,
      rotateX: 10,
      rotateY: -25,
      rotateZ: 0,
      depthZ: -30,
      blendMode: 'screen',
      beatReactivity: true,
    }
  },
  {
    id: 'full_stage_flat',
    nameEn: 'Flat Fullscreen 2D',
    nameHe: 'מסך מלא 2D שטוח',
    transform: {
      posX: 0,
      posY: 0,
      scale: 1.0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      depthZ: 0,
      blendMode: 'screen',
      beatReactivity: false,
    }
  }
];

interface SpatialLayerControlsProps {
  lang: Language;
  isDualLayerEnabled: boolean;
  setIsDualLayerEnabled: (enabled: boolean) => void;
  layer1Id: string;
  setLayer1Id: (id: string) => void;
  layer2Id: string;
  setLayer2Id: (id: string) => void;
  layer1Intensity: number;
  setLayer1Intensity: (val: number) => void;
  layer2Intensity: number;
  setLayer2Intensity: (val: number) => void;
  visualizerOptions: Array<{ id: string; nameEn: string; nameHe: string; engine: string; badge?: string }>;
  transform: LayerTransform;
  setTransform: React.Dispatch<React.SetStateAction<LayerTransform>>;
  isExporting?: boolean;
}

export function SpatialLayerControls({
  lang,
  isDualLayerEnabled,
  setIsDualLayerEnabled,
  layer1Id,
  setLayer1Id,
  layer2Id,
  setLayer2Id,
  layer1Intensity,
  setLayer1Intensity,
  layer2Intensity,
  setLayer2Intensity,
  visualizerOptions,
  transform,
  setTransform,
  isExporting = false
}: SpatialLayerControlsProps) {
  const isHe = lang === 'he';

  const updateTransform = (partial: Partial<LayerTransform>) => {
    setTransform(prev => ({ ...prev, ...partial }));
  };

  const applyPreset = (preset: SpatialPreset) => {
    setTransform(prev => ({ ...prev, ...preset.transform }));
  };

  const resetTransform = () => {
    setTransform(defaultLayerTransform);
  };

  const blendModes: Array<{ value: LayerTransform['blendMode']; labelEn: string; labelHe: string }> = [
    { value: 'screen', labelEn: 'Screen (Glow/Transparent)', labelHe: 'מסך (זוהר ושקיפות)' },
    { value: 'source-over', labelEn: 'Normal (Opaque)', labelHe: 'רגיל (ללא שילוב)' },
    { value: 'lighten', labelEn: 'Lighten (Additive)', labelHe: 'הבהרה (Lighten)' },
    { value: 'color-dodge', labelEn: 'Color Dodge (Neon Burst)', labelHe: 'זוהר ניאון (Color Dodge)' },
    { value: 'overlay', labelEn: 'Overlay (Vibrant)', labelHe: 'כיסוי מודגש (Overlay)' },
  ];

  const intensityPresets = [
    { label: isHe ? 'עדין' : 'Subtle', val: 0.6 },
    { label: isHe ? 'רגיל' : '1.0x', val: 1.0 },
    { label: isHe ? 'חזק' : 'High', val: 1.6 },
    { label: isHe ? 'מקסימום' : 'Max', val: 2.5 },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Master Dual-Layer Enable Toggle */}
      <div className="p-3.5 bg-gradient-to-br from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-500/30 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg transition-all ${isDualLayerEnabled ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40' : 'bg-white/10 text-gray-400'}`}>
              <Layers size={18} />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight text-white flex items-center gap-2">
                <span>{isHe ? 'שילוב 2 סגנונות במקביל' : 'Dual Layer Visualizer'}</span>
                {isDualLayerEnabled && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500 text-black animate-pulse">
                    ON
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isHe ? 'שכבת רקע (Base) + שכבה עליונה (3D Overlay)' : 'Background base layer + 3D positioned overlay'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDualLayerEnabled(!isDualLayerEnabled)}
            disabled={isExporting}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              isDualLayerEnabled 
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30' 
                : 'bg-white/10 hover:bg-white/20 text-gray-300'
            }`}
          >
            {isDualLayerEnabled ? (isHe ? 'פעיל' : 'Active') : (isHe ? 'הפעל' : 'Enable')}
          </button>
        </div>
      </div>

      {isDualLayerEnabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* 2. Layer Pickers & Individual Reactivity Sensitivities */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Grid size={12} />
                {isHe ? 'בחירת השכבות ועוצמת תגובה אישית' : 'Layers & Independent Reactivity'}
              </span>
            </div>

            {/* Layer 1: Base Background */}
            <div className="p-2.5 bg-white/[0.03] border border-indigo-500/20 rounded-lg space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/30 border border-indigo-400/50 text-[9px] font-mono flex items-center justify-center text-indigo-300">1</span>
                    {isHe ? 'שכבה 1 (רקע ראשי):' : 'Layer 1 (Base Background):'}
                  </span>
                  <span className="text-[9px] font-mono text-indigo-400 uppercase">
                    {visualizerOptions.find(v => v.id === layer1Id)?.engine || '3D'}
                  </span>
                </label>
                <select
                  value={layer1Id}
                  onChange={(e) => setLayer1Id(e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-[#1A1A1E] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 truncate"
                >
                  {visualizerOptions.map(v => (
                    <option key={`l1_${v.id}`} value={v.id}>
                      {isHe ? v.nameHe : v.nameEn} ({v.engine.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Layer 1 Reactivity Sensitivity Slider */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <Zap size={11} className="text-indigo-400" />
                    {isHe ? 'עוצמת תגובת שמע (שכבה 1):' : 'Audio Reactivity (Layer 1):'}
                  </span>
                  <span className="font-mono text-indigo-300 font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    {layer1Intensity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={layer1Intensity}
                  onChange={(e) => setLayer1Intensity(Number(e.target.value))}
                  disabled={isExporting}
                  className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1 pt-0.5">
                  {intensityPresets.map(p => (
                    <button
                      key={`l1_p_${p.val}`}
                      onClick={() => setLayer1Intensity(p.val)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                        Math.abs(layer1Intensity - p.val) < 0.08
                          ? 'bg-indigo-500 text-white font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-gray-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Layer 2: Overlay */}
            <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-lg space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/30 border border-cyan-400/50 text-[9px] font-mono flex items-center justify-center text-cyan-300">2</span>
                    {isHe ? 'שכבה 2 (עליונה / 3D Overlay):' : 'Layer 2 (Foreground / Overlay):'}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 uppercase">
                    {visualizerOptions.find(v => v.id === layer2Id)?.engine || '2D'}
                  </span>
                </label>
                <select
                  value={layer2Id}
                  onChange={(e) => setLayer2Id(e.target.value)}
                  disabled={isExporting}
                  className="w-full bg-[#1A1A1E] border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-medium focus:outline-none focus:border-cyan-400 truncate"
                >
                  {visualizerOptions.map(v => (
                    <option key={`l2_${v.id}`} value={v.id}>
                      {isHe ? v.nameHe : v.nameEn} {v.id === 'dancing_man' ? '🕺' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Layer 2 Reactivity Sensitivity Slider */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                    <Zap size={11} className="text-cyan-400" />
                    {isHe ? 'עוצמת תגובת שמע (שכבה 2):' : 'Audio Reactivity (Layer 2):'}
                  </span>
                  <span className="font-mono text-cyan-300 font-bold bg-cyan-500/20 px-1.5 py-0.5 rounded text-[10px]">
                    {layer2Intensity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={layer2Intensity}
                  onChange={(e) => setLayer2Intensity(Number(e.target.value))}
                  disabled={isExporting}
                  className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex items-center gap-1 pt-0.5">
                  {intensityPresets.map(p => (
                    <button
                      key={`l2_p_${p.val}`}
                      onClick={() => setLayer2Intensity(p.val)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${
                        Math.abs(layer2Intensity - p.val) < 0.08
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-gray-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Spatial 3D / 2D Quick Presets */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} />
                {isHe ? 'פריסטים של מיקום וזווית 3D' : '3D Spatial Presets'}
              </span>
              <button
                onClick={resetTransform}
                className="text-[9px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Reset Position"
              >
                <RefreshCw size={10} />
                {isHe ? 'איפוס' : 'Reset'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {spatialPresets.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="p-1.5 bg-white/5 hover:bg-cyan-500/15 border border-white/5 hover:border-cyan-500/40 rounded-lg text-start transition-all group"
                >
                  <div className="text-[11px] font-bold text-gray-300 group-hover:text-cyan-300 truncate">
                    {isHe ? p.nameHe : p.nameEn}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Fine 2D & 3D Spatial Transforms Sliders */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-3.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Rotate3d size={12} />
                {isHe ? 'כיוונון צירי 3D ומיקום (XYZ)' : '2D & 3D Spatial Axes (XYZ)'}
              </span>
            </div>

            {/* Depth Z (עומק פנימה והחוצה מהוידאו) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-gray-300 flex items-center gap-1">
                  <Box size={12} className="text-cyan-400" />
                  {isHe ? 'עומק ציר Z (פנימה / החוצה):' : 'Depth Z (In/Out Video):'}
                </span>
                <span className="font-mono text-cyan-400 text-[10px]">{transform.depthZ > 0 ? `+${transform.depthZ}px` : `${transform.depthZ}px`}</span>
              </div>
              <input
                type="range"
                min="-400"
                max="400"
                step="5"
                value={transform.depthZ}
                onChange={(e) => updateTransform({ depthZ: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                <span>{isHe ? '◄ עומק ברקע' : '◄ Deep Inside'}</span>
                <span>{isHe ? 'מרכז' : 'Center'}</span>
                <span>{isHe ? 'קרוב למסך ►' : 'Forward Out ►'}</span>
              </div>
            </div>

            {/* 3D Tilt X (הטיית זווית אופקית) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-gray-300 flex items-center gap-1">
                  <Rotate3d size={12} className="text-indigo-400" />
                  {isHe ? 'הטיית זווית 3D (ציר X):' : '3D Pitch Tilt (X-Axis):'}
                </span>
                <span className="font-mono text-indigo-300 text-[10px]">{transform.rotateX}°</span>
              </div>
              <input
                type="range"
                min="-75"
                max="75"
                step="1"
                value={transform.rotateX}
                onChange={(e) => updateTransform({ rotateX: Number(e.target.value) })}
                className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* 3D Rotate Y (סיבוב זווית לצדדים) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-gray-300 flex items-center gap-1">
                  <Rotate3d size={12} className="text-fuchsia-400" />
                  {isHe ? 'סיבוב זווית 3D (ציר Y):' : '3D Yaw Rotation (Y-Axis):'}
                </span>
                <span className="font-mono text-fuchsia-300 text-[10px]">{transform.rotateY}°</span>
              </div>
              <input
                type="range"
                min="-75"
                max="75"
                step="1"
                value={transform.rotateY}
                onChange={(e) => updateTransform({ rotateY: Number(e.target.value) })}
                className="w-full accent-fuchsia-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Position X / Y (מיקום דו-ממדי) */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-gray-300">{isHe ? 'מיקום X:' : 'Pos X:'}</span>
                  <span className="font-mono text-cyan-400">{transform.posX}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="1"
                  value={transform.posX}
                  onChange={(e) => updateTransform({ posX: Number(e.target.value) })}
                  className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-gray-300">{isHe ? 'מיקום Y:' : 'Pos Y:'}</span>
                  <span className="font-mono text-cyan-400">{transform.posY}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="1"
                  value={transform.posY}
                  onChange={(e) => updateTransform({ posY: Number(e.target.value) })}
                  className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Scale / Size (גודל וקנה מידה) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-gray-300 flex items-center gap-1">
                  <Maximize2 size={12} className="text-emerald-400" />
                  {isHe ? 'גודל וקנה מידה (Scale):' : 'Scale / Size:'}
                </span>
                <span className="font-mono text-emerald-400 text-[10px]">{Math.round(transform.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={transform.scale}
                onChange={(e) => updateTransform({ scale: Number(e.target.value) })}
                className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* 2D Rotation Z (סיבוב 2D) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-gray-300">{isHe ? 'סיבוב ציר 2D (Z):' : '2D Rotation (Z-Angle):'}</span>
                <span className="font-mono text-gray-400 text-[10px]">{transform.rotateZ}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="2"
                value={transform.rotateZ}
                onChange={(e) => updateTransform({ rotateZ: Number(e.target.value) })}
                className="w-full accent-gray-400 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* 5. Blending, Opacity & Beat Reactivity */}
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
              <Sparkles size={12} />
              {isHe ? 'מצבי שילוב ואפקטים' : 'Blending & FX Options'}
            </div>

            {/* Blend Mode Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">
                {isHe ? 'מצב שילוב שכבות (Blend Mode):' : 'Layer Blend Mode:'}
              </label>
              <select
                value={transform.blendMode}
                onChange={(e) => updateTransform({ blendMode: e.target.value as LayerTransform['blendMode'] })}
                className="w-full bg-[#1A1A1E] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {blendModes.map(bm => (
                  <option key={bm.value} value={bm.value}>
                    {isHe ? bm.labelHe : bm.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-gray-300 flex items-center gap-1">
                  <Eye size={12} className="text-cyan-400" />
                  {isHe ? 'שקיפות שכבה עליונה:' : 'Overlay Opacity:'}
                </span>
                <span className="font-mono text-cyan-400 text-[10px]">{Math.round(transform.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={transform.opacity}
                onChange={(e) => updateTransform({ opacity: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Toggles: Beat-reactive scale pulse & Mirror */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <Zap size={13} className="text-yellow-400" />
                  {isHe ? 'רטיטה וקפיצה עם הבאס (3D Beat Pulse)' : '3D Scale Pulse on Beat'}
                </span>
                <input
                  type="checkbox"
                  checked={transform.beatReactivity}
                  onChange={(e) => updateTransform({ beatReactivity: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <FlipHorizontal size={13} className="text-indigo-400" />
                  {isHe ? 'היפוך מראה (Flip X)' : 'Mirror Flip Horizontal'}
                </span>
                <input
                  type="checkbox"
                  checked={transform.mirrorX}
                  onChange={(e) => updateTransform({ mirrorX: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-white/5 rounded-lg transition-colors bg-cyan-950/20 border border-cyan-500/20">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-cyan-200 flex items-center gap-2">
                    <Sparkles size={13} className="text-cyan-400" />
                    {isHe ? 'ללא רקע במה מהבהב (דמות שקופה ונקייה)' : 'Clean Character (No Flashing Stage)'}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    {isHe ? 'הסרת רצפת הדיסקו, הגריד וההבהובים עבור שכבה 2' : 'Remove disco floor, stage grids & flashes for Layer 2'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={transform.hideStageBg}
                  onChange={(e) => updateTransform({ hideStageBg: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
