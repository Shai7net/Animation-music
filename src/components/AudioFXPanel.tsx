import React from 'react';
import { 
  Sliders, Zap, Mic, MicOff, Music, Eye, Radio, Sparkles, 
  Flame, Palette, Activity, Disc
} from 'lucide-react';
import { ColorPalette, colorPalettes } from '../colorPalettes';
import { Language, i18n } from '../i18n';

interface AudioFXPanelProps {
  lang: Language;
  bassBoost: number;
  setBassBoost: (val: number) => void;
  djFilter: number;
  setDjFilter: (val: number) => void;
  activePalette: string;
  setActivePalette: (id: string) => void;
  isMicActive: boolean;
  onToggleMic: () => void;
  onLoadDemoTrack: (style: 'synthwave' | 'edm' | 'lofi') => void;
  crtEffect: boolean;
  setCrtEffect: (val: boolean) => void;
  bloomEffect: boolean;
  setBloomEffect: (val: boolean) => void;
  glitchOnDrop: boolean;
  setGlitchOnDrop: (val: boolean) => void;
  isExporting: boolean;
}

export const AudioFXPanel: React.FC<AudioFXPanelProps> = ({
  lang,
  bassBoost,
  setBassBoost,
  djFilter,
  setDjFilter,
  activePalette,
  setActivePalette,
  isMicActive,
  onToggleMic,
  onLoadDemoTrack,
  crtEffect,
  setCrtEffect,
  bloomEffect,
  setBloomEffect,
  glitchOnDrop,
  setGlitchOnDrop,
  isExporting
}) => {
  const isHe = lang === 'he';

  return (
    <div className="space-y-4 text-xs">
      
      {/* 1. Live Input & Demo Generator Bar */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
            <Radio size={13} />
            {isHe ? 'קלט חי ודוגמיות קול' : 'Live Input & Demo Tracks'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Live Mic Toggle */}
          <button
            onClick={onToggleMic}
            disabled={isExporting}
            className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 font-bold transition-all ${
              isMicActive 
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md shadow-rose-500/20 animate-pulse' 
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {isMicActive ? <Mic size={14} /> : <MicOff size={14} />}
            <span className="text-[10px]">
              {isMicActive ? (isHe ? 'מיקרופון פעיל' : 'MIC LIVE') : (isHe ? 'הפעל מיקרופון' : 'Live Mic')}
            </span>
          </button>

          {/* Quick Demo Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onLoadDemoTrack(e.target.value as any);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              disabled={isExporting}
              className="w-full h-full bg-[#1e1e24] border border-white/10 text-cyan-300 font-bold p-1.5 rounded-lg text-[10px] focus:outline-none focus:border-cyan-500"
            >
              <option value="" disabled>{isHe ? '⚡ טען טראק דמו...' : '⚡ Load Demo Track...'}</option>
              <option value="synthwave">1. Cyber Synthwave (128 BPM)</option>
              <option value="edm">2. Quantum Dubstep Drop (140 BPM)</option>
              <option value="lofi">3. Midnight Lo-Fi Chill (85 BPM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Master Audio DSP & DJ Filters */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sliders size={13} />
            {isHe ? 'עיבוד סאונד ופילטרים' : 'Master Audio DSP & EQ'}
          </span>
        </div>

        {/* Bass Boost Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>{isHe ? 'הגברת באסים (Bass Boost)' : 'Bass Boost'}</span>
            <span className="font-mono text-cyan-400 font-bold">+{bassBoost} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="15"
            step="1"
            value={bassBoost}
            onChange={(e) => setBassBoost(Number(e.target.value))}
            className="w-full accent-cyan-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
        </div>

        {/* DJ Sweep Filter */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>{isHe ? 'פילטר DJ (Low/High Pass)' : 'DJ Dual Filter (LP/HP)'}</span>
            <span className="font-mono text-indigo-300 font-bold">
              {djFilter === 0 ? 'BYPASS' : djFilter < 0 ? `LP ${Math.round(djFilter * 100)}%` : `HP +${Math.round(djFilter * 100)}%`}
            </span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            value={djFilter}
            onChange={(e) => setDjFilter(Number(e.target.value))}
            className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] text-gray-500 font-mono">
            <span>LOWPASS</span>
            <span onClick={() => setDjFilter(0)} className="cursor-pointer hover:text-white underline">RESET</span>
            <span>HIGHPASS</span>
          </div>
        </div>
      </div>

      {/* 3. Color Palettes */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-bold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Palette size={13} />
            {isHe ? 'פלטת צבעים דינמית' : 'Color Palette Theme'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {colorPalettes.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePalette(p.id)}
              className={`p-2 rounded-lg border text-start flex items-center justify-between transition-all ${
                activePalette === p.id 
                  ? 'bg-fuchsia-500/20 border-fuchsia-500/60 text-white shadow-sm shadow-fuchsia-500/20' 
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-[10px] font-medium truncate">{isHe ? p.nameHe : p.nameEn}</span>
              <div className="flex -space-x-1 shrink-0">
                {p.colors.slice(0, 3).map((c, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/50" style={{ backgroundColor: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Visual Post-Processing FX Toggles */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
          <Sparkles size={13} />
          {isHe ? 'אפקטי פוסט ויזואליים' : 'Post-Processing FX'}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => setBloomEffect(!bloomEffect)}
            className={`p-2 rounded-lg border text-center transition-all ${
              bloomEffect 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold' 
                : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-[9px] block font-mono">BLOOM</span>
            <span className="text-[8px] opacity-70">{bloomEffect ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setCrtEffect(!crtEffect)}
            className={`p-2 rounded-lg border text-center transition-all ${
              crtEffect 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' 
                : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-[9px] block font-mono">CRT SCAN</span>
            <span className="text-[8px] opacity-70">{crtEffect ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setGlitchOnDrop(!glitchOnDrop)}
            className={`p-2 rounded-lg border text-center transition-all ${
              glitchOnDrop 
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold' 
                : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-[9px] block font-mono">DROP FLASH</span>
            <span className="text-[8px] opacity-70">{glitchOnDrop ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
