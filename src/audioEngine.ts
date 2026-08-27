// Advanced Audio Engine & DSP Processor with Real-time Beat/Onset Detection & Procedural Demo Synthesizer

export interface AudioBands {
  subBass: number;   // 20 - 60 Hz (normalized 0-1)
  bass: number;      // 60 - 250 Hz
  lowMid: number;    // 250 - 500 Hz
  mid: number;       // 500 - 2000 Hz
  highMid: number;   // 2000 - 6000 Hz
  treble: number;    // 6000 - 20000 Hz
  overallEnergy: number;
  // Calibrated Decibel & Dynamic Range Engine
  rmsDb: number;        // Real dBFS (-90dB to 0dB)
  peakDb: number;       // Peak dBFS (-90dB to 0dB)
  gatedEnergy: number;  // 0.0 when quiet/silent, smoothly 0.0 to 1.0 when active
  isSilent: boolean;    // True if below -48 dB noise floor
  perceivedLoudness: number; // Perceptual loudness (0.0 to 1.0)
}

export interface BeatState {
  isBeat: boolean;
  isDrop: boolean;
  beatIntensity: number; // 0 to 1 with decay
  bpm: number;
  vuLevel: number;
  currentDb: number;     // dBFS value for UI meter
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  
  // FX Nodes
  private bassFilter: BiquadFilterNode | null = null;
  private djFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private outputDest: MediaStreamAudioDestinationNode | null = null;

  // DSP Data buffers
  public freqData: Uint8Array = new Uint8Array(0);
  public timeData: Uint8Array = new Uint8Array(0);

  // Beat Detection State
  private energyHistory: number[] = [];
  private historySize = 43; // ~1 second of frames at 43fps
  private lastBeatTime = 0;
  private beatDecay = 0;
  private beatIntervals: number[] = [];
  private estimatedBpm = 128;
  private dropDetected = false;
  private dropCooldown = 0;

  constructor() {}

  public getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public initForAudioElement(audioEl: HTMLAudioElement) {
    const ctx = this.getContext();

    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (!this.bassFilter) {
      // Bass boost shelving filter
      this.bassFilter = ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 150;
      this.bassFilter.gain.value = 0; // 0dB default
    }

    if (!this.djFilter) {
      // DJ filter (switchable lowpass/highpass)
      this.djFilter = ctx.createBiquadFilter();
      this.djFilter.type = 'allpass';
      this.djFilter.frequency.value = 1000;
      this.djFilter.Q.value = 1.0;
    }

    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 1.0;
    }

    if (!this.sourceNode) {
      try {
        this.sourceNode = ctx.createMediaElementSource(audioEl);
        
        // Chain: Source -> BassFilter -> DjFilter -> MasterGain -> Analyser -> Destination
        this.sourceNode.connect(this.bassFilter);
        this.bassFilter.connect(this.djFilter);
        this.djFilter.connect(this.masterGain);
        this.masterGain.connect(this.analyser);
        this.analyser.connect(ctx.destination);
      } catch (e) {
        console.warn('Source node already connected or audio element issue:', e);
      }
    }

    return {
      analyser: this.analyser,
      sourceNode: this.sourceNode
    };
  }

  public async enableMicrophone(): Promise<boolean> {
    try {
      const ctx = this.getContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;

      if (!this.analyser) {
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 512;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
      }

      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(this.analyser);
      // Note: do not connect mic to ctx.destination to avoid feedback squeal
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      return false;
    }
  }

  public disableMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
  }

  public setBassBoost(db: number) {
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setTargetAtTime(Math.max(-10, Math.min(20, db)), this.ctx.currentTime, 0.05);
    }
  }

  // DJ Filter: -1.0 (Heavy Lowpass) to 0.0 (Bypass) to +1.0 (Heavy Highpass)
  public setDJFilter(val: number) {
    if (!this.djFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    
    if (Math.abs(val) < 0.05) {
      this.djFilter.type = 'allpass';
    } else if (val < 0) {
      // Lowpass sweep from 20kHz down to 200Hz
      this.djFilter.type = 'lowpass';
      const freq = 200 + Math.pow(1 + val, 3) * 19800; // val is -1..0
      this.djFilter.frequency.setTargetAtTime(freq, now, 0.05);
      this.djFilter.Q.setTargetAtTime(2.0, now, 0.05);
    } else {
      // Highpass sweep from 20Hz up to 5000Hz
      this.djFilter.type = 'highpass';
      const freq = 20 + Math.pow(val, 2) * 5000;
      this.djFilter.frequency.setTargetAtTime(freq, now, 0.05);
      this.djFilter.Q.setTargetAtTime(2.0, now, 0.05);
    }
  }

  public analyze(): { bands: AudioBands; beat: BeatState } {
    if (!this.analyser) {
      return {
        bands: { 
          subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, overallEnergy: 0,
          rmsDb: -90, peakDb: -90, gatedEnergy: 0, isSilent: true, perceivedLoudness: 0
        },
        beat: { isBeat: false, isDrop: false, beatIntensity: 0, bpm: 128, vuLevel: 0, currentDb: -90 }
      };
    }

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    // 1. Time-Domain Decibel & Peak Analysis
    let sumSquares = 0;
    let maxPeak = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const val = (this.timeData[i] - 128) / 128;
      const absVal = Math.abs(val);
      if (absVal > maxPeak) maxPeak = absVal;
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / this.timeData.length);
    
    // Convert to dBFS (-90 dB to 0 dB)
    const rmsDb = rms > 0.00001 ? Math.max(-90, Math.min(0, 20 * Math.log10(rms))) : -90;
    const peakDb = maxPeak > 0.00001 ? Math.max(-90, Math.min(0, 20 * Math.log10(maxPeak))) : -90;

    // Noise Floor Gate: below -48 dBFS is considered quiet/silent
    const noiseFloorDb = -48;
    const isSilent = rmsDb < noiseFloorDb || rms < 0.003;
    
    // Normalized Dynamic Loudness (0.0 at noise floor -> 1.0 at 0 dBFS)
    let gatedEnergy = 0;
    if (!isSilent) {
      const rawNormalized = (rmsDb - noiseFloorDb) / (-noiseFloorDb); // 0 to 1
      gatedEnergy = Math.max(0, Math.min(1, Math.pow(rawNormalized, 1.3)));
    }

    // 2. Frequency Spectral Bands
    const binCount = this.analyser.frequencyBinCount;
    // Nyquist is ~22050Hz, so each bin in 256 bins is ~86Hz
    const getAvgBand = (startHz: number, endHz: number) => {
      const startBin = Math.max(0, Math.floor((startHz / 22050) * binCount));
      const endBin = Math.min(binCount - 1, Math.ceil((endHz / 22050) * binCount));
      if (endBin <= startBin) return this.freqData[startBin] / 255;
      let sum = 0;
      for (let i = startBin; i <= endBin; i++) sum += this.freqData[i];
      const raw = sum / ((endBin - startBin + 1) * 255);
      // Suppress spectral floor when silent
      return isSilent ? 0 : Math.max(0, (raw - 0.02) / 0.98);
    };

    const subBass = getAvgBand(20, 65);
    const bass = getAvgBand(65, 250);
    const lowMid = getAvgBand(250, 600);
    const mid = getAvgBand(600, 2500);
    const highMid = getAvgBand(2500, 6000);
    const treble = getAvgBand(6000, 16000);

    let sumTotal = 0;
    for (let i = 0; i < binCount; i++) sumTotal += this.freqData[i];
    const rawOverall = sumTotal / (binCount * 255);
    const overallEnergy = isSilent ? 0 : rawOverall;
    const perceivedLoudness = Math.min(1.0, gatedEnergy * 0.7 + overallEnergy * 0.3);

    // 3. Beat Detection: Energy vs Local Moving Average (only active if not silent)
    const instantBassEnergy = subBass * 1.5 + bass;
    let isBeat = false;

    if (!isSilent && instantBassEnergy > 0.1) {
      this.energyHistory.push(instantBassEnergy);
      if (this.energyHistory.length > this.historySize) {
        this.energyHistory.shift();
      }

      let avgHistEnergy = 0;
      let variance = 0;
      for (const e of this.energyHistory) avgHistEnergy += e;
      avgHistEnergy /= this.energyHistory.length || 1;

      for (const e of this.energyHistory) variance += Math.pow(e - avgHistEnergy, 2);
      variance /= this.energyHistory.length || 1;

      // Dynamic threshold based on variance
      const c = Math.max(1.15, 1.4 - variance * 0.5);
      const nowMs = performance.now();

      if (instantBassEnergy > c * avgHistEnergy && nowMs - this.lastBeatTime > 200 && instantBassEnergy > 0.15) {
        isBeat = true;
        const interval = nowMs - this.lastBeatTime;
        this.lastBeatTime = nowMs;
        this.beatDecay = 1.0;

        if (interval >= 300 && interval <= 1200) {
          this.beatIntervals.push(interval);
          if (this.beatIntervals.length > 8) this.beatIntervals.shift();
          const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
          this.estimatedBpm = Math.round(60000 / avgInterval);
        }
      } else {
        this.beatDecay = Math.max(0, this.beatDecay - 0.06);
      }
    } else {
      this.beatDecay = Math.max(0, this.beatDecay - 0.08);
    }

    // Drop Detector: Sudden explosion from low energy to massive subBass
    let isDrop = false;
    if (this.dropCooldown > 0) {
      this.dropCooldown--;
    } else if (!isSilent && subBass > 0.75 && overallEnergy > 0.6 && this.beatDecay > 0.8) {
      isDrop = true;
      this.dropCooldown = 60; // 1-2 sec cooldown
    }

    return {
      bands: { 
        subBass, bass, lowMid, mid, highMid, treble, overallEnergy,
        rmsDb, peakDb, gatedEnergy, isSilent, perceivedLoudness
      },
      beat: {
        isBeat,
        isDrop,
        beatIntensity: this.beatDecay,
        bpm: this.estimatedBpm,
        vuLevel: isSilent ? 0 : Math.min(1.0, rms * 2.5),
        currentDb: Math.round(rmsDb)
      }
    };
  }
}

// Procedural Demo Synth Tracks (100% royalty-free, built in real-time with Web Audio WAV encoder)
export function generateProceduralAudioBlob(style: 'synthwave' | 'edm' | 'lofi'): Blob {
  const sampleRate = 44100;
  const bpm = style === 'synthwave' ? 128 : style === 'edm' ? 140 : 85;
  const beatSec = 60 / bpm;
  const barSec = beatSec * 4;
  const totalBars = 8; // 8 bars loop
  const duration = barSec * totalBars;
  const totalSamples = Math.floor(sampleRate * duration);

  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Synthwave: 128 BPM cyberpunk bass arpeggio, 808 kick, snare, synth chords
  if (style === 'synthwave') {
    const chordFreqs = [
      [130.81, 155.56, 196.00], // C minor
      [116.54, 146.83, 174.61], // Bb major
      [103.83, 130.81, 155.56], // Ab major
      [116.54, 146.83, 174.61], // Bb major
    ];

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / beatSec);
      const bar = Math.floor(t / barSec) % 4;
      const subBeat = beat % 1;
      const sixteenth = (beat * 4) % 1;

      let s = 0;

      // 1. Kick on every beat (4-on-the-floor)
      const kickDecay = Math.max(0, 1 - subBeat * 4);
      if (kickDecay > 0) {
        const kickFreq = 150 * Math.exp(-subBeat * 25) + 45;
        s += Math.sin(2 * Math.PI * kickFreq * t) * kickDecay * 0.7;
      }

      // 2. Snare on beats 2 & 4
      const beatNum = Math.floor(beat) % 4;
      if (beatNum === 1 || beatNum === 3) {
        const snareDecay = Math.max(0, 1 - subBeat * 3);
        const noise = (Math.random() * 2 - 1) * 0.3;
        const snareBody = Math.sin(2 * Math.PI * 180 * t) * 0.3;
        s += (noise + snareBody) * snareDecay * 0.5;
      }

      // 3. Rolling 16th Synth Bass Arp
      const arpNoteIdx = Math.floor(beat * 4) % 4;
      const chord = chordFreqs[bar];
      const baseNote = chord[arpNoteIdx % chord.length] * 0.5;
      const arpDecay = Math.max(0, 1 - sixteenth * 2.5);
      const saw = (2 * ((t * baseNote) % 1) - 1);
      s += saw * arpDecay * 0.35;

      // 4. Warm Synth Chords with LFO Filter
      const chordNotes = chordFreqs[bar];
      for (const f of chordNotes) {
        const osc = Math.sin(2 * Math.PI * f * 2 * t) + 0.5 * Math.sin(2 * Math.PI * f * 4 * t);
        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t);
        s += osc * lfo * 0.12;
      }

      left[i] = Math.max(-1, Math.min(1, s));
      right[i] = Math.max(-1, Math.min(1, s));
    }
  } 
  // EDM / Dubstep: 140 BPM heavy sub drop, wobble bass, build-up
  else if (style === 'edm') {
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / beatSec);
      const subBeat = beat % 1;
      let s = 0;

      // Heavy 808 Sub Kick
      const kickDecay = Math.max(0, 1 - subBeat * 3.5);
      if (kickDecay > 0) {
        const kickFreq = 160 * Math.exp(-subBeat * 20) + 40;
        s += Math.sin(2 * Math.PI * kickFreq * t) * kickDecay * 0.8;
      }

      // Wobble Bass with LFO modulation
      const wobbleLfo = 4 + 4 * Math.sin(2 * Math.PI * (bpm / 60 / 2) * t);
      const bassFreq = 55; // A1
      const saw = (2 * ((t * bassFreq) % 1) - 1);
      const wobbleMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * wobbleLfo * t);
      s += saw * wobbleMod * 0.4;

      // Hi-hats on offbeats
      const hatDecay = Math.max(0, 1 - ((beat * 2) % 1) * 6);
      s += (Math.random() * 2 - 1) * hatDecay * 0.2;

      left[i] = Math.max(-1, Math.min(1, s));
      right[i] = Math.max(-1, Math.min(1, s));
    }
  } 
  // Lo-Fi Ambient: 85 BPM dusty Rhodes chords, vinyl crackle, gentle kick
  else {
    const lofiChords = [220, 261.63, 329.63, 392.00]; // Am7
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beat = (t / beatSec);
      const subBeat = beat % 1;
      let s = 0;

      // Vinyl dust crackle
      if (Math.random() < 0.003) s += (Math.random() * 2 - 1) * 0.15;

      // Soft Sub Kick
      if (Math.floor(beat) % 2 === 0) {
        const kDecay = Math.max(0, 1 - subBeat * 2.5);
        s += Math.sin(2 * Math.PI * 60 * t) * kDecay * 0.5;
      }

      // Warm Electric Piano Chords
      for (const f of lofiChords) {
        const vibrato = Math.sin(2 * Math.PI * 5 * t) * 2;
        const sine = Math.sin(2 * Math.PI * (f + vibrato) * t);
        s += sine * 0.08;
      }

      left[i] = Math.max(-1, Math.min(1, s));
      right[i] = Math.max(-1, Math.min(1, s));
    }
  }

  // Encode to 16-bit PCM WAV Blob
  return encodeWAV(left, right, sampleRate);
}

function encodeWAV(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = left.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF Chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // fmt Chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data Chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    const sR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
    offset += 2;
    view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
