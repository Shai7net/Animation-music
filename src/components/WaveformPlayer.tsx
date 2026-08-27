import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { ZoomIn, ZoomOut, Activity } from 'lucide-react';

interface WaveformPlayerProps {
  audioUrl: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTime: number;
  duration: number;
  isExporting: boolean;
  lang: 'en' | 'he';
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  audioRef,
  currentTime,
  duration,
  isExporting,
  lang
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [zoom, setZoom] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    setIsReady(false);

    try {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      // Create gradient for waves
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let waveGradient: CanvasGradient | string = '#374151';
      let progGradient: CanvasGradient | string = '#06b6d4';

      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 48);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(0.5, 'rgba(150, 150, 180, 0.3)');
        grad.addColorStop(1, 'rgba(50, 50, 70, 0.2)');
        waveGradient = grad;

        const pGrad = ctx.createLinearGradient(0, 0, 0, 48);
        pGrad.addColorStop(0, '#38bdf8');
        pGrad.addColorStop(0.5, '#06b6d4');
        pGrad.addColorStop(1, '#0284c7');
        progGradient = pGrad;
      }

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: waveGradient,
        progressColor: progGradient,
        cursorColor: '#22d3ee',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 48,
        normalize: true,
        media: audioRef.current || undefined,
        url: audioUrl,
        dragToSeek: true
      });

      ws.on('ready', () => {
        setIsReady(true);
      });

      wavesurferRef.current = ws;

      return () => {
        try {
          ws.destroy();
        } catch (e) {}
      };
    } catch (err) {
      console.warn('WaveSurfer init error:', err);
    }
  }, [audioUrl, audioRef]);

  const handleZoom = (delta: number) => {
    if (!wavesurferRef.current) return;
    const newZoom = Math.max(0, Math.min(100, zoom + delta));
    setZoom(newZoom);
    wavesurferRef.current.zoom(newZoom);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col justify-center min-w-0">
      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">{formatTime(currentTime)}</span>
          <span className="text-white/20">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 flex items-center gap-1 text-[9px] uppercase tracking-wider hidden sm:flex">
            <Activity size={10} className="text-cyan-500" />
            {lang === 'he' ? 'זיהוי דרופים וגלי קול' : 'Drop & Peak Waveform'}
          </span>
          <div className="flex items-center gap-1 bg-white/5 rounded px-1 border border-white/5">
            <button
              onClick={() => handleZoom(-15)}
              disabled={zoom <= 0 || isExporting}
              className="p-1 hover:text-white text-gray-400 transition-colors disabled:opacity-30"
              title="Zoom out waveform"
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-[8px] text-gray-500 w-4 text-center">{zoom}px</span>
            <button
              onClick={() => handleZoom(15)}
              disabled={zoom >= 100 || isExporting}
              className="p-1 hover:text-white text-gray-400 transition-colors disabled:opacity-30"
              title="Zoom in waveform"
            >
              <ZoomIn size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* WaveSurfer Track Container */}
      <div className="relative w-full h-12 bg-black/40 rounded-lg overflow-hidden border border-white/5 flex items-center">
        {!isReady && audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 text-[9px] text-cyan-400 font-mono animate-pulse">
            {lang === 'he' ? 'טוען גלי קול אינטראקטיביים...' : 'Generating interactive waveform...'}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full cursor-pointer" />
      </div>
    </div>
  );
};
