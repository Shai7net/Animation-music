import React, { useRef } from 'react';
import { 
  Film, Upload, Zap, Activity, Gauge, Shuffle, 
  RotateCcw, Sliders, CheckCircle2, AlertCircle, 
  Sparkles, Layers, Scissors, Repeat, ArrowLeftRight,
  Maximize2
} from 'lucide-react';
import { Language, i18n } from '../i18n';

export interface VideoRemixSettings {
  speedSensitivity: number; // 0.2 to 4.0 (how aggressive speed jumps are)
  minSpeed: number;        // 0.05 to 1.2 (playback rate when audio is quiet/low)
  maxSpeed: number;        // 1.0 to 6.0 (playback rate when audio is loud/peak)
  invertReactivity: boolean; // false: lows=slow / highs=fast, true: lows=fast / highs=slow
  freqDriver: 'bass' | 'mid' | 'treble' | 'master' | 'drop';
  smoothing: number;       // 0.05 to 0.8 (smooth speed transition inertia)
  endBehavior: 'cut_at_video' | 'loop_video'; // 'cut_at_video' prevents trailing black screen
  videoFit: 'cover' | 'contain';
  strobeOnDrop: boolean;
}

interface VideoRemixPanelProps {
  lang: Language;
  videoFile: File | null;
  videoUrl: string | null;
  videoDimensions: { width: number; height: number } | null;
  videoDuration: number;
  currentVideoSpeed: number;
  settings: VideoRemixSettings;
  setSettings: React.Dispatch<React.SetStateAction<VideoRemixSettings>>;
  onUploadVideo: (file: File) => void;
  onLoadDemoVideo: () => void;
  isLoadingDemo: boolean;
  onMatchVideoDimensions: () => void;
  isExporting: boolean;
  isActiveStyle: boolean;
  onSelectVideoStyle: () => void;
}

export const VideoRemixPanel: React.FC<VideoRemixPanelProps> = ({
  lang,
  videoFile,
  videoUrl,
  videoDimensions,
  videoDuration,
  currentVideoSpeed,
  settings,
  setSettings,
  onUploadVideo,
  onLoadDemoVideo,
  isLoadingDemo,
  onMatchVideoDimensions,
  isExporting,
  isActiveStyle,
  onSelectVideoStyle
}) => {
  const isHe = lang === 'he';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onUploadVideo(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadVideo(e.target.files[0]);
    }
  };

  const updateSetting = <K extends keyof VideoRemixSettings>(key: K, val: VideoRemixSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const formatSec = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 text-xs">
      
      {/* 1. Video Upload / Dropzone & Demo Generator */}
      <div 
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-3 relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
            <Film size={13} />
            {isHe ? 'קטע וידאו להאצה/האטה לפי המוזיקה' : 'Video Clip Audio-Reactive Remix'}
          </span>
          {videoUrl && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 size={10} />
              {isHe ? 'וידאו נטען' : 'Loaded'}
            </span>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileInput} 
          accept="video/mp4,video/webm,video/quicktime,video/mkv,video/*" 
          className="hidden" 
          disabled={isExporting}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isExporting}
            className="p-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex flex-col items-center justify-center gap-1 transition-all text-center group active:scale-95"
          >
            <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-[11px]">{isHe ? 'העלה סרטון וידאו' : 'Upload Video File'}</span>
            <span className="text-[8px] text-cyan-400/60 font-mono">MP4, WebM, MOV</span>
          </button>

          <button
            onClick={onLoadDemoVideo}
            disabled={isExporting || isLoadingDemo}
            className="p-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold flex flex-col items-center justify-center gap-1 transition-all text-center group active:scale-95"
          >
            <Sparkles size={16} className={`group-hover:rotate-12 transition-transform ${isLoadingDemo ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">{isLoadingDemo ? (isHe ? 'מייצר קטע דמו...' : 'Generating...') : (isHe ? 'טען וידאו דמו VJ' : 'Load Demo VJ Clip')}</span>
            <span className="text-[8px] text-indigo-400/60 font-mono">3D Cyber Tunnel Loop</span>
          </button>
        </div>

        {/* Video Metadata Card */}
        {videoUrl && videoDimensions && (
          <div className="p-2.5 bg-black/40 border border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-gray-400 truncate max-w-[140px]">{videoFile ? videoFile.name : 'Demo_VJ_Tunnel.webm'}</span>
              <span className="text-cyan-300">{videoDimensions.width}x{videoDimensions.height}</span>
            </div>
            
            <div className="flex items-center justify-between text-[9px] text-gray-400">
              <span>{isHe ? 'משך הוידאו:' : 'Duration:'} <strong className="text-white font-mono">{formatSec(videoDuration)}</strong></span>
              <button
                onClick={onMatchVideoDimensions}
                className="px-2 py-1 rounded bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 text-gray-300 border border-white/10 transition-colors flex items-center gap-1"
                title={isHe ? 'התאם את רזולוציית הייצוא והפרופורציות לוידאו זה' : 'Auto-match export resolution and aspect ratio to this video'}
              >
                <Maximize2 size={10} />
                <span>{isHe ? 'התאם הגדרות ייצוא לוידאו' : 'Match Export Ratio'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Activate Video Style Button if not active */}
        {!isActiveStyle && videoUrl && (
          <button
            onClick={onSelectVideoStyle}
            className="w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white font-black text-[11px] rounded-lg shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Film size={14} />
            <span>{isHe ? 'הפעל סגנון רמיקס וידאו במסך הראשי' : 'Switch Canvas to Video Remix Style'}</span>
          </button>
        )}
      </div>

      {/* 2. Live Playback Speed HUD Gauge */}
      <div className="p-3 bg-gradient-to-br from-black/80 to-[#161622] border border-cyan-500/30 rounded-xl space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold flex items-center gap-1.5">
            <Gauge size={13} className="text-cyan-400 animate-pulse" />
            {isHe ? 'מהירות תנועה חיה (Live Speed)' : 'Live Dynamic Video Speed'}
          </span>
          <span className={`font-mono text-sm font-black px-2 py-0.5 rounded border ${
            currentVideoSpeed > 2.2 
              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm shadow-fuchsia-500/20' 
              : currentVideoSpeed < 0.6 
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          }`}>
            {currentVideoSpeed.toFixed(2)}x
          </span>
        </div>

        {/* Speed Meter Bar */}
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
          <div 
            className="absolute h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 rounded-full transition-all duration-75"
            style={{ 
              width: `${Math.min(100, Math.max(5, ((currentVideoSpeed - settings.minSpeed) / (settings.maxSpeed - settings.minSpeed || 1)) * 100))}%` 
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
          <span>{settings.minSpeed.toFixed(2)}x ({isHe ? 'שקט / איטי' : 'Low/Slow'})</span>
          <span className="text-cyan-400/80">
            {settings.invertReactivity 
              ? (isHe ? '⚡ מצב הפוך: נמוכים מהר / גבוהים לאט' : '⚡ Inverted: Lows Fast / Highs Slow') 
              : (isHe ? '🎵 מצב רגיל: נמוכים לאט / גבוהים מהר' : '🎵 Normal: Lows Slow / Highs Fast')}
          </span>
          <span>{settings.maxSpeed.toFixed(1)}x ({isHe ? 'שיא / טורבו' : 'High/Peak'})</span>
        </div>
      </div>

      {/* 3. Audio Reactivity Direction & Frequency Driver */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-gray-300 font-bold flex items-center gap-1.5">
            <Zap size={13} className="text-yellow-400" />
            {isHe ? 'מנוע תגובתיות וסגנון תנועה' : 'Reactivity Driver & Motion Curve'}
          </span>
        </div>

        {/* Invert Speed Toggle */}
        <button
          onClick={() => updateSetting('invertReactivity', !settings.invertReactivity)}
          disabled={isExporting}
          className={`w-full p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
            settings.invertReactivity 
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-md shadow-amber-500/10' 
              : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={15} className={settings.invertReactivity ? 'text-amber-400' : 'text-cyan-400'} />
            <div>
              <div className="text-xs font-bold">
                {settings.invertReactivity 
                  ? (isHe ? 'מצב הפוך: בנמוכים מהר, בגבוהים לאט' : 'Inverted: Lows Fast, Highs Slow') 
                  : (isHe ? 'מצב רגיל: בנמוכים לאט, בגבוהים מהר' : 'Normal: Lows Slow, Highs Fast')}
              </div>
              <div className="text-[9px] opacity-70 mt-0.5">
                {isHe 
                  ? (settings.invertReactivity ? 'הוידאו טס בבסים ובשקט ומאט בשיאי הטראק' : 'הוידאו זז לאט בשקט/בסים ומאיץ בעוצמה גבוהה ודרופים') 
                  : (settings.invertReactivity ? 'Video accelerates on bass/quiet and slows on peaks' : 'Video moves in slow-mo on quiet/lows and turbo on beats')}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0">
            {settings.invertReactivity ? (isHe ? 'הפוך' : 'INVERT') : (isHe ? 'רגיל' : 'NORMAL')}
          </span>
        </button>

        {/* Frequency Driver selector */}
        <div>
          <label className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mb-1.5 block">
            {isHe ? 'תדר המניע את המהירות (Frequency Band):' : 'Audio Band Driving Speed:'}
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'bass', label: isHe ? 'בס נמוך' : 'Bass', desc: '60-250Hz' },
              { id: 'mid', label: isHe ? 'מידים' : 'Mids', desc: '500-2kHz' },
              { id: 'treble', label: isHe ? 'גבוהים' : 'Highs', desc: '6-20kHz' },
              { id: 'master', label: isHe ? 'אנרגיה' : 'Master', desc: 'Full' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => updateSetting('freqDriver', b.id as any)}
                disabled={isExporting}
                className={`py-1.5 px-1 rounded-lg text-center border transition-all ${
                  settings.freqDriver === b.id 
                    ? 'bg-cyan-500 text-black font-black border-cyan-400 shadow-sm' 
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-[10px] font-bold">{b.label}</div>
                <div className="text-[8px] opacity-70">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Speed Limits & Sensitivity Sliders */}
      <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-300 font-bold flex items-center gap-1.5">
          <Sliders size={13} className="text-cyan-400" />
          {isHe ? 'כוונון עוצמת מהירות ורגישות' : 'Speed Range & Sensitivity Controls'}
        </span>

        {/* Reactivity Sensitivity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">{isHe ? 'עוצמת תגובתיות המהירות (Intensity)' : 'Speed Reactivity Sensitivity'}</span>
            <span className="font-mono text-cyan-400 font-bold">{settings.speedSensitivity.toFixed(1)}x</span>
          </div>
          <input 
            type="range" 
            min="0.3" 
            max="3.5" 
            step="0.1" 
            value={settings.speedSensitivity} 
            onChange={e => updateSetting('speedSensitivity', parseFloat(e.target.value))} 
            className="w-full accent-cyan-500 h-1 bg-white/10 rounded-lg cursor-pointer" 
            disabled={isExporting}
          />
        </div>

        {/* Minimum Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">{isHe ? 'מהירות מינימלית (איטי / Lows)' : 'Minimum Speed (Slow-mo)'}</span>
            <span className="font-mono text-cyan-400 font-bold">{settings.minSpeed.toFixed(2)}x</span>
          </div>
          <input 
            type="range" 
            min="0.05" 
            max="1.2" 
            step="0.05" 
            value={settings.minSpeed} 
            onChange={e => updateSetting('minSpeed', parseFloat(e.target.value))} 
            className="w-full accent-cyan-500 h-1 bg-white/10 rounded-lg cursor-pointer" 
            disabled={isExporting}
          />
        </div>

        {/* Maximum Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">{isHe ? 'מהירות מקסימלית (טורבו / Highs)' : 'Maximum Speed (Turbo Peak)'}</span>
            <span className="font-mono text-fuchsia-400 font-bold">{settings.maxSpeed.toFixed(1)}x</span>
          </div>
          <input 
            type="range" 
            min="1.2" 
            max="6.0" 
            step="0.2" 
            value={settings.maxSpeed} 
            onChange={e => updateSetting('maxSpeed', parseFloat(e.target.value))} 
            className="w-full accent-fuchsia-500 h-1 bg-white/10 rounded-lg cursor-pointer" 
            disabled={isExporting}
          />
        </div>

        {/* Motion Smoothing Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-300">{isHe ? 'החלקת מעברי מהירות (Smoothing)' : 'Speed Transition Smoothing'}</span>
            <span className="font-mono text-indigo-400 font-bold">{Math.round(settings.smoothing * 100)}%</span>
          </div>
          <input 
            type="range" 
            min="0.05" 
            max="0.8" 
            step="0.05" 
            value={settings.smoothing} 
            onChange={e => updateSetting('smoothing', parseFloat(e.target.value))} 
            className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg cursor-pointer" 
            disabled={isExporting}
          />
        </div>
      </div>

      {/* 5. Clean Export End Sync & Black Screen Prevention */}
      <div className="p-3 bg-white/[0.03] border border-cyan-500/20 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold flex items-center gap-1.5">
            <Scissors size={13} />
            {isHe ? 'סנכרון סיום ייצוא (מניעת מסך שחור)' : 'Export End Sync (No Black Screen)'}
          </span>
        </div>

        <p className="text-[9px] text-gray-400 leading-tight">
          {isHe 
            ? 'אם רצועת האודיו ארוכה יותר מהוידאו, בחר כיצד לסיים את הייצוא באופן נקי וללא מסך שחור ריק בסוף:' 
            : 'If audio is longer than video, choose how to cleanly finish the export without any trailing black screen:'}
        </p>

        <div className="space-y-1.5">
          {/* Option A: Cut at video end */}
          <button
            onClick={() => updateSetting('endBehavior', 'cut_at_video')}
            disabled={isExporting}
            className={`w-full p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
              settings.endBehavior === 'cut_at_video' 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200' 
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Scissors size={13} className="text-cyan-400" />
                <span>{isHe ? 'חיתוך בסיום הוידאו (האודיו נחתך בסוף)' : 'Cut Export at Video End (Trim Audio)'}</span>
              </div>
              <div className="text-[9px] opacity-70 mt-0.5">
                {isHe ? 'הייצוא נעצר בדיוק בסוף הסרטון, ללא מסך שחור!' : 'Export cleanly finishes when video ends, preventing any blank black screen.'}
              </div>
            </div>
            {settings.endBehavior === 'cut_at_video' && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
          </button>

          {/* Option B: Seamless video loop */}
          <button
            onClick={() => updateSetting('endBehavior', 'loop_video')}
            disabled={isExporting}
            className={`w-full p-2.5 rounded-lg border text-start flex items-center justify-between transition-all ${
              settings.endBehavior === 'loop_video' 
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Repeat size={13} className="text-indigo-400" />
                <span>{isHe ? 'לופ וידאו רציף עד סיום האודיו' : 'Seamless Video Loop Until Audio Ends'}</span>
              </div>
              <div className="text-[9px] opacity-70 mt-0.5">
                {isHe ? 'הוידאו ממשיך בלולאה חלקה עד שהשיר מסתיים' : 'Video continuously loops until the audio track is finished.'}
              </div>
            </div>
            {settings.endBehavior === 'loop_video' && <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />}
          </button>
        </div>
      </div>

    </div>
  );
};
