import React from 'react';
import { 
  Maximize, Minimize, Activity, Zap, Keyboard, HelpCircle, 
  Flame, Radio, EyeOff, Sparkles, Sliders
} from 'lucide-react';
import { BeatState, AudioBands } from '../audioEngine';
import { Language } from '../i18n';
import { Layers } from 'lucide-react';

interface VJModeHUDProps {
  lang: Language;
  beatState: BeatState;
  bands: AudioBands;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenShortcuts: () => void;
  isDualLayerEnabled?: boolean;
  onToggleDualLayer?: () => void;
  currentVideoSpeed?: number;
  isVideoModeActive?: boolean;
}

export const VJModeHUD: React.FC<VJModeHUDProps> = ({
  lang,
  beatState,
  bands,
  isFullscreen,
  onToggleFullscreen,
  onOpenShortcuts,
  isDualLayerEnabled = false,
  onToggleDualLayer,
  currentVideoSpeed,
  isVideoModeActive
}) => {
  const isHe = lang === 'he';

  return (
    <div className="flex items-center gap-2">
      
      {/* Live Video Speed HUD (when Video Remix is active) */}
      {isVideoModeActive && currentVideoSpeed !== undefined && (
        <div 
          className="px-2.5 py-1 rounded-full border border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 backdrop-blur-md flex items-center gap-1.5 font-mono text-[10px] font-bold text-cyan-200 shadow-md shadow-cyan-500/20"
          title={isHe ? `מהירות וידאו תגובתית חיה: ${currentVideoSpeed.toFixed(2)}x` : `Live Audio-Reactive Speed: ${currentVideoSpeed.toFixed(2)}x`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>{currentVideoSpeed.toFixed(2)}x</span>
        </div>
      )}

      {/* Dual Layer Quick Badge / Toggle */}
      {onToggleDualLayer && (
        <button
          onClick={onToggleDualLayer}
          className={`px-2 py-1 rounded-lg border backdrop-blur-md hidden sm:flex items-center gap-1.5 transition-all text-[10px] font-bold ${
            isDualLayerEnabled
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/30'
              : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title={isHe ? 'הפעל/כבה שילוב 2 סגנונות במקביל (3D Spatial)' : 'Toggle Dual Layer 3D Spatial Mode'}
        >
          <Layers size={13} className={isDualLayerEnabled ? 'text-cyan-400' : ''} />
          <span>{isHe ? 'שכבה כפולה' : 'Dual 3D'}</span>
          {isDualLayerEnabled && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
        </button>
      )}

      {/* Real-time BPM & Beat Pulse Badge */}
      <div className={`px-2.5 py-1 rounded-full border backdrop-blur-md flex items-center gap-1.5 transition-all ${
        beatState.isBeat 
          ? 'bg-rose-500/30 border-rose-500 text-rose-200 shadow-lg shadow-rose-500/40 scale-105' 
          : 'bg-black/60 border-white/10 text-gray-300'
      }`}>
        <div className={`w-2 h-2 rounded-full transition-transform ${
          beatState.isBeat ? 'bg-rose-400 scale-150 shadow-sm' : 'bg-gray-600'
        }`} />
        <span className="text-[10px] font-mono font-bold tracking-tight">
          {beatState.bpm || 128} <span className="text-[8px] opacity-70">BPM</span>
        </span>
      </div>

      {/* Real-time Decibel (dBFS) Meter Badge */}
      <div 
        className={`px-2.5 py-1 rounded-full border backdrop-blur-md hidden md:flex items-center gap-1.5 font-mono text-[10px] font-bold transition-all ${
          bands.isSilent 
            ? 'bg-black/40 border-white/5 text-gray-500' 
            : beatState.currentDb > -6 
            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm shadow-rose-500/20' 
            : beatState.currentDb > -18 
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20' 
            : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
        }`}
        title={isHe ? `עוצמת שמע נוכחית: ${bands.isSilent ? 'שקט (מתחת ל-Noise Floor)' : `${beatState.currentDb} dBFS`}` : `Audio Level: ${bands.isSilent ? 'Silence / Gated' : `${beatState.currentDb} dBFS`}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${
          bands.isSilent ? 'bg-gray-600' : beatState.currentDb > -6 ? 'bg-rose-400' : 'bg-emerald-400'
        }`} />
        <span>{bands.isSilent ? (isHe ? 'שקט' : 'SILENT') : `${beatState.currentDb} dB`}</span>
      </div>

      {/* Mini 6-band Spectral Audio VU */}
      <div className="hidden sm:flex items-end gap-0.5 h-5 px-2 py-1 bg-black/60 border border-white/10 backdrop-blur-md rounded-lg">
        <div 
          className="w-1 bg-cyan-400 rounded-t transition-all duration-75" 
          style={{ height: `${Math.max(2, bands.subBass * 100)}%` }} 
          title="Sub-Bass"
        />
        <div 
          className="w-1 bg-indigo-400 rounded-t transition-all duration-75" 
          style={{ height: `${Math.max(2, bands.bass * 100)}%` }} 
          title="Bass"
        />
        <div 
          className="w-1 bg-violet-400 rounded-t transition-all duration-75" 
          style={{ height: `${Math.max(2, bands.lowMid * 100)}%` }} 
          title="Low Mid"
        />
        <div 
          className="w-1 bg-fuchsia-400 rounded-t transition-all duration-75" 
          style={{ height: `${Math.max(2, bands.mid * 100)}%` }} 
          title="Mid"
        />
        <div 
          className="w-1 bg-amber-400 rounded-t transition-all duration-75" 
          style={{ height: `${Math.max(2, bands.highMid * 100)}%` }} 
          title="High Mid"
        />
        <div 
          className="w-1 bg-emerald-400 rounded-t transition-all duration-75" 
          style={{ height: `${Math.max(2, bands.treble * 100)}%` }} 
          title="Treble"
        />
      </div>

      {/* Keyboard Shortcuts Button */}
      <button
        onClick={onOpenShortcuts}
        className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white rounded-lg transition-all"
        title={isHe ? 'קיצורי מקלדת' : 'Keyboard Shortcuts'}
      >
        <Keyboard size={14} />
      </button>

      {/* Fullscreen VJ Mode Button */}
      <button
        onClick={onToggleFullscreen}
        className="p-1.5 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg transition-all shadow-md shadow-cyan-500/10"
        title={isFullscreen ? (isHe ? 'יציאה ממסך מלא' : 'Exit Fullscreen') : (isHe ? 'מצב VJ במסך מלא' : 'Fullscreen VJ Mode')}
      >
        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      </button>

    </div>
  );
};
