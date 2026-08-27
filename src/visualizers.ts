export interface VisualizerOptions {
  hideBackground?: boolean;
}

export interface Visualizer {
  id: string;
  nameEn: string;
  nameHe: string;
  hasBackgroundToggle?: boolean;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, freq: Uint8Array, time: Uint8Array, t: number, options?: VisualizerOptions) => void;
}

const state: Record<string, any> = {};

function getAvg(arr: Uint8Array, start = 0, end = arr.length) {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += arr[i];
  return sum / (end - start);
}

export const visualizers: Visualizer[] = [
  // --- 0. 3D DIVE CATEGORY ---
  {
    id: '3d_cyber_dive',
    nameEn: '3D: Cyber Dive',
    nameHe: 'תלת-ממד: צלילה סייבר',
    draw: (ctx, w, h, freq, time, t) => {
      // Clear with trailing effect
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      
      const cx = w / 2;
      const cy = h / 2;
      const fov = 300;
      const avgFreq = getAvg(freq) / 255;
      
      if (!state.cyber_dive || state.cyber_dive.w !== w) {
        state.cyber_dive = {
          w,
          grids: Array.from({ length: 20 }, (_, i) => ({ z: (i / 20) * 1000 }))
        };
      }
      
      // Speed reacts to music
      const speed = 2 + avgFreq * 15;
      const maxZ = 1000;
      
      const grids = state.cyber_dive.grids;
      
      ctx.lineWidth = 1;
      
      for (let i = 0; i < grids.length; i++) {
        let grid = grids[i];
        grid.z -= speed;
        if (grid.z <= 0) grid.z = maxZ;
        
        // Perspective projection
        const scale = fov / (fov + grid.z);
        const rectW = w * 1.5 * scale;
        const rectH = h * 1.5 * scale;
        const x = cx - rectW / 2;
        const y = cy - rectH / 2;
        
        // Colors change as it comes closer, reacting to frequency array
        // We use grid.z to pick a frequency bucket
        const freqBucket = Math.floor(((maxZ - grid.z) / maxZ) * (freq.length / 2));
        const f = (freq[freqBucket] || 0) / 255;
        
        const opacity = Math.max(0, 1 - (grid.z / maxZ)); // fade in from distance
        const hue = (t * 0.05 + grid.z * 0.1) % 360;
        
        // Main grid stroke
        ctx.strokeStyle = `hsla(${hue}, 100%, ${50 + f * 30}%, ${opacity})`;
        ctx.lineWidth = scale * (2 + f * 8); // Thicker as it approaches and on beat
        
        ctx.beginPath();
        ctx.rect(x, y, rectW, rectH);
        ctx.stroke();
        
        // Draw connection lines to next grid for 3D tunnel effect
        if (i > 0) {
          const prevGrid = grids[i - 1];
          // don't draw connection if it wraps around
          if (prevGrid.z < grid.z) {
            const pScale = fov / (fov + prevGrid.z);
            const pRectW = w * 1.5 * pScale;
            const pRectH = h * 1.5 * pScale;
            const px = cx - pRectW / 2;
            const py = cy - pRectH / 2;
            
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(px, py); // TL
            ctx.moveTo(x + rectW, y); ctx.lineTo(px + pRectW, py); // TR
            ctx.moveTo(x, y + rectH); ctx.lineTo(px, py + pRectH); // BL
            ctx.moveTo(x + rectW, y + rectH); ctx.lineTo(px + pRectW, py + pRectH); // BR
            ctx.stroke();
          }
        }
      }
      
      // Draw center core/sun
      const coreR = Math.min(w, h) * 0.05 + avgFreq * (Math.min(w, h) * 0.2);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, '#fff');
      coreGrad.addColorStop(1, 'rgba(0,255,255,0)');
      
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  // --- 0. CHARACTER CATEGORY ---
  {
    id: 'dancing_man',
    nameEn: 'Character: Dancing Man',
    nameHe: 'דמות: איש מרקד',
    hasBackgroundToggle: true,
    draw: (ctx, w, h, freq, time, t, options) => {
      // 1. Audio & Decibel Analysis with Noise Floor Gating
      let sumSq = 0;
      let maxPeak = 0;
      for (let i = 0; i < time.length; i++) {
        const v = (time[i] - 128) / 128;
        const absV = Math.abs(v);
        if (absV > maxPeak) maxPeak = absV;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / time.length);
      const rmsDb = rms > 0.0001 ? Math.max(-90, Math.min(0, 20 * Math.log10(rms))) : -90;

      const rawBass = getAvg(freq, 0, 12) / 255;
      const rawMid = getAvg(freq, 18, 70) / 255;
      const rawTreble = getAvg(freq, 80, 160) / 255;
      const rawTotal = (rawBass * 1.5 + rawMid * 1.0 + rawTreble * 0.7) / 3.2;

      // Strict Noise Floor Gate: quiet/silence below -46 dBFS or negligible energy
      const noiseFloorDb = -46;
      const isQuiet = rmsDb < noiseFloorDb || (rawTotal < 0.035 && rms < 0.008);

      let targetIntensity = 0;
      let targetBass = 0;
      let targetMid = 0;
      let targetTreble = 0;

      if (!isQuiet) {
        // Map dynamic range 0.0 (at noise floor) to 1.0 (at peak 0 dB)
        const normalizedDb = Math.max(0, Math.min(1, (rmsDb - noiseFloorDb) / (-noiseFloorDb)));
        targetIntensity = Math.pow(normalizedDb, 1.3);
        targetBass = Math.min(1.0, Math.pow(Math.max(0, (rawBass - 0.04) / 0.65), 1.2));
        targetMid = Math.min(1.0, Math.pow(Math.max(0, (rawMid - 0.03) / 0.65), 1.1));
        targetTreble = Math.min(1.0, Math.max(0, (rawTreble - 0.03) / 0.65));
      }

      // 2. Initialize and Interpolate State
      if (!state.dance || state.dance.w !== w) {
        state.dance = {
          w,
          intensity: 0,
          smoothBass: 0,
          smoothMid: 0,
          smoothTreble: 0,
          dancePhase: 0,
          notes: [],
          sparks: [],
          lastTime: t,
          floorFlash: 0
        };
      }

      const d = state.dance;
      const dt = Math.min(50, Math.max(1, t - (d.lastTime || t)));
      d.lastTime = t;

      // Attack / Release smoothing: snappy attack, smooth organic decay when calming down
      const attackRate = targetIntensity > d.intensity ? 0.22 : 0.07;
      d.intensity += (targetIntensity - d.intensity) * attackRate;
      d.smoothBass += (targetBass - d.smoothBass) * (targetBass > d.smoothBass ? 0.25 : 0.09);
      d.smoothMid += (targetMid - d.smoothMid) * (targetMid > d.smoothMid ? 0.2 : 0.08);
      d.smoothTreble += (targetTreble - d.smoothTreble) * 0.15;

      // Force strictly 0 at low energy to eliminate any lingering micro-jitter
      if (d.intensity < 0.008) d.intensity = 0;
      if (d.smoothBass < 0.008) d.smoothBass = 0;
      if (d.smoothMid < 0.008) d.smoothMid = 0;
      if (d.smoothTreble < 0.008) d.smoothTreble = 0;

      // Advance dance phase ONLY when there is music energy
      const tempoSpeed = (0.003 + d.smoothBass * 0.007 + d.intensity * 0.004);
      if (d.intensity > 0.01) {
        d.dancePhase += dt * tempoSpeed;
      }

      const energy = d.intensity; // 0.0 = calm/still, 0.5 = grooving, 1.0 = raging/crazy
      const p = d.dancePhase;

      // 3. Clear Background & Disco Stage (or Clean Transparent Canvas when hideBackground is active)
      if (!options?.hideBackground) {
        ctx.fillStyle = 'rgba(10, 10, 14, 0.25)';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const cx = w / 2;
      const cy = h * 0.48;
      const size = Math.min(w, h) * 0.14;
      const floorY = cy + size * 2.3;

      if (!options?.hideBackground) {
        // Floor Flash on Bass Drops / Peaks
        if (d.smoothBass > 0.75) {
          d.floorFlash = 0.8;
        } else {
          d.floorFlash = Math.max(0, d.floorFlash - 0.05);
        }

        if (d.floorFlash > 0.05) {
          ctx.fillStyle = `hsla(${(t * 0.1) % 360}, 100%, 50%, ${d.floorFlash * 0.12})`;
          ctx.fillRect(0, 0, w, h);
        }

        // 4. Perspective 3D Disco Floor Grid
        ctx.save();
        const gridCols = 14;
        const gridRows = 8;
        const gridW = w * 1.2;
        for (let r = 0; r <= gridRows; r++) {
          const rowProgress = r / gridRows;
          const y = floorY + Math.pow(rowProgress, 1.8) * (h - floorY);
          const rowAlpha = (0.05 + energy * 0.25) * (1 - rowProgress * 0.5);
          ctx.strokeStyle = `hsla(${(t * 0.05 + r * 15) % 360}, 80%, 50%, ${rowAlpha})`;
          ctx.lineWidth = 1 + rowProgress * 2;
          ctx.beginPath();
          ctx.moveTo(cx - gridW * (0.3 + rowProgress * 0.7), y);
          ctx.lineTo(cx + gridW * (0.3 + rowProgress * 0.7), y);
          ctx.stroke();
        }

        for (let c = 0; c <= gridCols; c++) {
          const xOffset = (c / gridCols - 0.5) * gridW * 1.4;
          const colAlpha = 0.04 + energy * 0.2;
          ctx.strokeStyle = `hsla(${(t * 0.05 + c * 20) % 360}, 80%, 50%, ${colAlpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, floorY - size * 0.2);
          ctx.lineTo(cx + xOffset, h);
          ctx.stroke();
        }

        // Spotlight under dancer
        const spotR = size * (1.2 + energy * 1.5 + d.smoothBass * 0.8);
        const spotGrad = ctx.createRadialGradient(cx, floorY, 5, cx, floorY, spotR);
        const spotHue = (t * 0.1) % 360;
        spotGrad.addColorStop(0, `hsla(${spotHue}, 100%, 60%, ${0.05 + energy * 0.4})`);
        spotGrad.addColorStop(0.7, `hsla(${spotHue}, 100%, 40%, ${0.02 + energy * 0.15})`);
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.ellipse(cx, floorY, spotR, spotR * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Clean transparent canvas with subtle soft grounded shadow under feet (no flashing)
        const shadowR = size * 0.5;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, floorY, shadowR, shadowR * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Music Particles & Sparks (Only active when music plays)
      if (energy > 0.25) {
        // Musical notes erupting from dancer
        if ((d.smoothTreble > 0.4 || d.smoothBass > 0.5) && Math.random() < energy * 0.35) {
          d.notes.push({
            x: cx + (Math.random() - 0.5) * size * 1.5,
            y: cy - size * 1.2 + (Math.random() - 0.5) * size * 0.5,
            vx: (Math.random() - 0.5) * (2 + energy * 4),
            vy: -2 - Math.random() * (3 + energy * 6),
            sym: Math.random() > 0.5 ? '♫' : Math.random() > 0.5 ? '♪' : '★',
            c: `hsl(${(t * 0.15 + Math.random() * 60) % 360}, 100%, 65%)`,
            scale: 0.8 + Math.random() * 0.8,
            life: 1.0
          });
        }

        // Bass spark bursts on ground when landing jumps
        if (d.smoothBass > 0.65 && Math.random() < 0.4) {
          for (let k = 0; k < 3; k++) {
            d.sparks.push({
              x: cx + (Math.random() - 0.5) * size * 0.8,
              y: floorY,
              vx: (Math.random() - 0.5) * (4 + energy * 8),
              vy: -1 - Math.random() * (3 + energy * 5),
              c: `hsl(${(t * 0.2) % 360}, 100%, 75%)`,
              life: 1.0
            });
          }
        }
      }

      // Draw & Update Notes
      for (let i = d.notes.length - 1; i >= 0; i--) {
        const n = d.notes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.life -= 0.015;
        if (n.life <= 0 || n.y < -30) {
          d.notes.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.font = `bold ${Math.round(size * 0.3 * n.scale)}px sans-serif`;
        ctx.fillStyle = n.c;
        ctx.globalAlpha = Math.max(0, n.life);
        ctx.shadowBlur = 10;
        ctx.shadowColor = n.c;
        ctx.fillText(n.sym, n.x, n.y);
        ctx.restore();
      }

      // Draw & Update Sparks
      for (let i = d.sparks.length - 1; i >= 0; i--) {
        const s = d.sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.25; // gravity
        s.life -= 0.03;
        if (s.life <= 0) {
          d.sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = s.c;
        ctx.globalAlpha = s.life;
        ctx.fillRect(s.x, s.y, 3, 3);
      }
      ctx.globalAlpha = 1.0;

      // 6. Kinematic Rigging of the Dancer
      // Base resting proportions
      const torsoLen = size * 1.3;
      const armLen = size * 0.72;
      const legLen = size * 0.98;

      // A. IDLE / CALM POSE (energy == 0):
      // - Spine strictly vertical, arms resting naturally along sides of torso/legs
      // - Feet planted squarely on the floor, no bounce, no headbang
      // - Subtle breathing (0.5px) if t is running
      const breath = energy === 0 ? Math.sin(t * 0.002) * 1.5 : 0;

      // B. DYNAMIC DANCE POSE (energy > 0):
      // - Jump & bounce driven by bass and dancePhase
      let jump = 0;
      if (energy > 0.6) {
        // Crazy Jump when energy is high / peaking
        jump = -Math.max(0, Math.sin(p * 2)) * Math.pow((energy - 0.5) * 2, 1.5) * size * 0.9;
      }
      const kneeBounce = -Math.abs(Math.sin(p)) * size * 0.45 * energy;
      const totalBounce = jump + kneeBounce + breath;

      // Hip Position
      const hipSway = Math.sin(p * 0.8) * size * 0.35 * energy;
      const hipX = cx + hipSway;
      const hipY = (floorY - legLen * 1.02) + totalBounce;

      // Spine & Head Position
      const spineLean = Math.cos(p * 0.9) * size * 0.25 * energy + (Math.sin(p * 2.5) * size * 0.15 * d.smoothBass);
      const headX = cx + spineLean * 0.8;
      const headY = hipY - torsoLen + (energy > 0.7 ? Math.sin(p * 3) * size * 0.2 * d.smoothBass : 0);
      const shoulderY = headY + size * 0.38;

      // Dancer Color & Neon Glow
      const mainHue = (t * 0.08) % 360;
      const dancerColor = `hsl(${mainHue}, 100%, ${60 + energy * 20}%)`;
      const secondaryColor = `hsl(${(mainHue + 60) % 360}, 100%, 70%)`;
      const glowPower = 10 + energy * 25 + d.smoothBass * 15;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw Supercharged Aura when Peak / Wild dancing
      if (energy > 0.65) {
        ctx.shadowBlur = glowPower * 1.5;
        ctx.shadowColor = dancerColor;
        ctx.strokeStyle = `hsla(${mainHue}, 100%, 75%, ${(energy - 0.5) * 0.4})`;
        ctx.lineWidth = size * 0.35;
        ctx.beginPath();
        ctx.moveTo(headX, headY);
        ctx.lineTo(hipX, hipY);
        ctx.stroke();
      }

      ctx.shadowBlur = glowPower;
      ctx.shadowColor = dancerColor;
      ctx.strokeStyle = dancerColor;
      ctx.lineWidth = size * 0.16;

      // 7. Rigging Legs & Feet
      // Idle: Left Foot at cx - size * 0.45, Right Foot at cx + size * 0.45, firmly on floor
      const lFootRestX = cx - size * 0.45;
      const rFootRestX = cx + size * 0.45;

      // Active dance footwork
      const lStepX = lFootRestX + Math.sin(p) * size * 0.4 * energy;
      const rStepX = rFootRestX + Math.cos(p) * size * 0.4 * energy;
      const lFootY = floorY + (jump < 0 ? jump * 0.5 : 0) + (energy > 0.4 ? Math.max(0, -Math.sin(p)) * size * 0.3 * energy : 0);
      const rFootY = floorY + (jump < 0 ? jump * 0.5 : 0) + (energy > 0.4 ? Math.max(0, Math.sin(p)) * size * 0.3 * energy : 0);

      // Left Leg Joint
      const lHipAngle = Math.atan2(lFootY - hipY, lStepX - (hipX - size * 0.2));
      const lKneeX = (hipX - size * 0.2) + Math.cos(lHipAngle - 0.2 * energy) * legLen * 0.52;
      const lKneeY = hipY + Math.sin(lHipAngle - 0.2 * energy) * legLen * 0.52;

      ctx.beginPath();
      ctx.moveTo(hipX - size * 0.2, hipY);
      ctx.lineTo(lKneeX, lKneeY);
      ctx.lineTo(lStepX, lFootY);
      ctx.stroke();

      // Right Leg Joint
      const rHipAngle = Math.atan2(rFootY - hipY, rStepX - (hipX + size * 0.2));
      const rKneeX = (hipX + size * 0.2) + Math.cos(rHipAngle + 0.2 * energy) * legLen * 0.52;
      const rKneeY = hipY + Math.sin(rHipAngle + 0.2 * energy) * legLen * 0.52;

      ctx.beginPath();
      ctx.moveTo(hipX + size * 0.2, hipY);
      ctx.lineTo(rKneeX, rKneeY);
      ctx.lineTo(rStepX, rFootY);
      ctx.stroke();

      // Shoes / Sneakers
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.ellipse(lStepX, lFootY, size * 0.18, size * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(rStepX, rFootY, size * 0.18, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // 8. Torso & Spine
      ctx.strokeStyle = dancerColor;
      ctx.lineWidth = size * 0.18;
      ctx.beginPath();
      ctx.moveTo(headX, shoulderY);
      ctx.lineTo(hipX, hipY);
      ctx.stroke();

      // Hip Belt / Joint
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(hipX, hipY, size * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // 9. Rigging Arms & Hands
      // IDLE POSE: Hands strictly hanging down at the sides of the torso/body
      // ACTIVE / WILD POSE: Lifting, pointing, waving, throwing hands up in the air!
      
      const lShoulderX = headX - size * 0.28;
      const rShoulderX = headX + size * 0.28;

      let lElbowX: number, lElbowY: number, lHandX: number, lHandY: number;
      let rElbowX: number, rElbowY: number, rHandX: number, rHandY: number;

      if (energy <= 0.01) {
        // --- 100% IDLE RESTING POSE (Arms at sides of body) ---
        // Left Arm: hangs straight down along left flank
        lElbowX = lShoulderX - size * 0.06;
        lElbowY = shoulderY + armLen * 0.95;
        lHandX = lShoulderX - size * 0.03;
        lHandY = lElbowY + armLen * 0.95;

        // Right Arm: hangs straight down along right flank
        rElbowX = rShoulderX + size * 0.06;
        rElbowY = shoulderY + armLen * 0.95;
        rHandX = rShoulderX + size * 0.03;
        rHandY = rElbowY + armLen * 0.95;
      } else if (energy < 0.4) {
        // --- LOW ENERGY GROOVE: subtle rhythmic arm sway near body ---
        const swayL = Math.sin(p) * 0.35 * energy;
        const swayR = -Math.cos(p) * 0.35 * energy;

        lElbowX = lShoulderX - size * (0.08 + energy * 0.15) + Math.sin(p) * size * 0.15 * energy;
        lElbowY = shoulderY + armLen * 0.9;
        lHandX = lElbowX + Math.sin(p * 1.2) * size * 0.2 * energy;
        lHandY = lElbowY + armLen * 0.9;

        rElbowX = rShoulderX + size * (0.08 + energy * 0.15) + Math.cos(p) * size * 0.15 * energy;
        rElbowY = shoulderY + armLen * 0.9;
        rHandX = rElbowX - Math.cos(p * 1.2) * size * 0.2 * energy;
        rHandY = rElbowY + armLen * 0.9;
      } else if (energy < 0.7) {
        // --- MEDIUM ENERGY: dancing, elbow flexion, disco chest pump ---
        const armAngleL = Math.PI * 0.55 + Math.sin(p * 1.3) * Math.PI * 0.45 * energy;
        const armAngleR = Math.PI * 0.45 - Math.cos(p * 1.3) * Math.PI * 0.45 * energy;

        lElbowX = lShoulderX + Math.cos(armAngleL) * armLen * 0.9;
        lElbowY = shoulderY + Math.sin(armAngleL) * armLen * 0.9;
        lHandX = lElbowX + Math.cos(armAngleL - 0.6 - d.smoothBass * 0.4) * armLen * 0.9;
        lHandY = lElbowY + Math.sin(armAngleL - 0.6 - d.smoothBass * 0.4) * armLen * 0.9;

        rElbowX = rShoulderX + Math.cos(armAngleR) * armLen * 0.9;
        rElbowY = shoulderY + Math.sin(armAngleR) * armLen * 0.9;
        rHandX = rElbowX + Math.cos(armAngleR + 0.6 + d.smoothBass * 0.4) * armLen * 0.9;
        rHandY = rElbowY + Math.sin(armAngleR + 0.6 + d.smoothBass * 0.4) * armLen * 0.9;
      } else {
        // --- HIGH & WILD ENERGY (משתולל): Hands in the air, rave jumping! ---
        const ravePhase = p * 1.6;
        const armWaveL = Math.sin(ravePhase) * 0.5;
        const armWaveR = Math.cos(ravePhase) * 0.5;

        // Arms reach high above head (angle ~ -Math.PI * 0.6 to -Math.PI * 0.3)
        const lUpAngle = -Math.PI * 0.55 + armWaveL * 0.6;
        const rUpAngle = -Math.PI * 0.45 - armWaveR * 0.6;

        lElbowX = lShoulderX + Math.cos(lUpAngle) * armLen * 1.0;
        lElbowY = shoulderY + Math.sin(lUpAngle) * armLen * 1.0;
        lHandX = lElbowX + Math.cos(lUpAngle - 0.3) * armLen * 1.0;
        lHandY = lElbowY + Math.sin(lUpAngle - 0.3) * armLen * 1.0;

        rElbowX = rShoulderX + Math.cos(rUpAngle) * armLen * 1.0;
        rElbowY = shoulderY + Math.sin(rUpAngle) * armLen * 1.0;
        rHandX = rElbowX + Math.cos(rUpAngle + 0.3) * armLen * 1.0;
        rHandY = rElbowY + Math.sin(rUpAngle + 0.3) * armLen * 1.0;
      }

      // Draw Left Arm
      ctx.beginPath();
      ctx.moveTo(lShoulderX, shoulderY);
      ctx.lineTo(lElbowX, lElbowY);
      ctx.lineTo(lHandX, lHandY);
      ctx.stroke();

      // Draw Right Arm
      ctx.beginPath();
      ctx.moveTo(rShoulderX, shoulderY);
      ctx.lineTo(rElbowX, rElbowY);
      ctx.lineTo(rHandX, rHandY);
      ctx.stroke();

      // Hand Glow Spheres
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.arc(lHandX, lHandY, size * 0.1, 0, Math.PI * 2);
      ctx.arc(rHandX, rHandY, size * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // 10. Head & DJ Accessories
      const headRadius = size * 0.38 * (1 + d.smoothBass * 0.12 * energy);
      const headCenterY = headY - size * 0.35;

      // Head Base
      ctx.fillStyle = dancerColor;
      ctx.beginPath();
      ctx.arc(headX, headCenterY, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // DJ Headphones / Headset
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = size * 0.08;
      ctx.beginPath();
      ctx.arc(headX, headCenterY, headRadius * 1.15, Math.PI * 0.85, Math.PI * 2.15);
      ctx.stroke();

      // Headphone Ear Cups with glowing pulse
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.ellipse(headX - headRadius * 1.05, headCenterY, size * 0.1, size * 0.16, 0, 0, Math.PI * 2);
      ctx.ellipse(headX + headRadius * 1.05, headCenterY, size * 0.1, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      // 11. Face Details (Cool Sunglasses & Dynamic Mouth)
      ctx.shadowBlur = 0; // Crisp face details

      // Cyber Shades / Sunglasses
      ctx.fillStyle = '#08080c';
      const glassesW = headRadius * 1.4;
      const glassesH = headRadius * 0.55;
      ctx.beginPath();
      ctx.roundRect(headX - glassesW / 2, headCenterY - glassesH * 0.45, glassesW, glassesH, 4);
      ctx.fill();
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sunglasses Visualizer Reflection lines
      if (energy > 0.05) {
        ctx.fillStyle = `hsl(${(mainHue + 120) % 360}, 100%, 65%)`;
        for (let b = 0; b < 6; b++) {
          const barFrac = (freq[b * 8] || 0) / 255;
          const bh = barFrac * (glassesH * 0.7) * energy;
          const bx = headX - glassesW * 0.4 + b * (glassesW * 0.15);
          ctx.fillRect(bx, headCenterY + glassesH * 0.2 - bh, glassesW * 0.09, bh);
        }
      } else {
        // Idle reflection line on glasses
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(headX - glassesW * 0.35, headCenterY - glassesH * 0.1);
        ctx.lineTo(headX + glassesW * 0.35, headCenterY - glassesH * 0.1);
        ctx.stroke();
      }

      // Dynamic Mouth:
      // Calm line when idle; opens and sings excitedly on treble & energy
      ctx.strokeStyle = '#08080c';
      ctx.fillStyle = '#08080c';
      if (energy <= 0.01) {
        // Gentle relaxed resting smile
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(headX, headCenterY + headRadius * 0.35, size * 0.08, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // Singing mouth reacting to singing / treble
        const mouthOpen = size * 0.04 + d.smoothTreble * size * 0.12 * energy;
        ctx.beginPath();
        ctx.ellipse(headX, headCenterY + headRadius * 0.5, size * 0.09, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 12. Real-time Dancer Status & Decibel Indicator on Stage Floor
      if (!options?.hideBackground) {
        ctx.save();
        const statusText = energy <= 0.01 
          ? '💤 IDLE / SILENCE (STANDING STILL)' 
          : energy < 0.35 
          ? '🎵 CHILL GROOVE' 
          : energy < 0.7 
          ? '🔥 DANCING' 
          : '⚡ WILD PARTY / RAVE MODE!';

        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = energy <= 0.01 
          ? 'rgba(150, 150, 150, 0.5)' 
          : energy > 0.7 
          ? 'rgba(255, 100, 200, 0.9)' 
          : 'rgba(0, 255, 240, 0.8)';
        ctx.fillText(
          `${statusText}  |  ${isQuiet ? 'MUTED / < -46 dB' : `${Math.round(rmsDb)} dBFS`}  |  INTENSITY: ${Math.round(energy * 100)}%`,
          cx,
          h - 18
        );
        ctx.restore();
      }

      ctx.restore();
    }
  },

  // --- 1. BARS AND WAVES CATEGORY ---
  {
    id: 'classic_bars',
    nameEn: 'Bars: Classic',
    nameHe: 'ברים: קלאסי',
    draw: (ctx, w, h, freq) => {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);
      const bars = 64;
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const val = freq[i];
        const barH = (val / 255) * h * 0.8;
        ctx.fillStyle = `hsl(${(i / bars) * 200 + 100}, 100%, 50%)`;
        ctx.fillRect(i * barW + barW * 0.1, h - barH, barW * 0.8, barH);
      }
    }
  },
  {
    id: 'bars_ocean',
    nameEn: 'Bars & Waves: Ocean',
    nameHe: 'ברים וגלים: אוקיינוס',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0, 10, 30, 0.4)';
      ctx.fillRect(0, 0, w, h);
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        const slices = 32;
        for (let i = 0; i <= slices; i++) {
          const fIdx = Math.floor((i / slices) * (freq.length / 2));
          const f = freq[fIdx] / 255;
          const x = (i / slices) * w;
          const y = h - (f * h * 0.4) - (Math.sin(t * 0.002 + i * 0.2 + j) * h * 0.1) - (j * h * 0.1);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.fillStyle = `hsla(${200 + j * 20}, 100%, 50%, 0.3)`;
        ctx.fill();
      }
    }
  },
  {
    id: 'bars_fire',
    nameEn: 'Bars & Waves: Fire',
    nameHe: 'ברים וגלים: אש',
    draw: (ctx, w, h, freq) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      const bars = 64;
      for (let i = 0; i < bars; i++) {
        const f = freq[i] / 255;
        const barH = f * h * 0.7;
        const x = (i / bars) * w;
        const grad = ctx.createLinearGradient(0, h, 0, h - barH);
        grad.addColorStop(0, 'rgba(255, 0, 0, 1)');
        grad.addColorStop(0.5, 'rgba(255, 128, 0, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 0, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, h - barH, w / bars - 2, barH);
      }
    }
  },
  {
    id: 'bars_scope',
    nameEn: 'Bars & Waves: Scope',
    nameHe: 'ברים וגלים: סקופ',
    draw: (ctx, w, h, freq, time) => {
      ctx.fillStyle = 'rgba(0,20,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = '#0f0';
      ctx.lineWidth = 2;
      for (let i = 0; i < time.length; i += 2) {
        const x = (i / time.length) * w;
        const y = h / 2 + ((time[i] - 128) / 128) * (h / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  {
    id: 'bars_cylinder',
    nameEn: 'Bars & Waves: Cylinder',
    nameHe: 'ברים וגלים: גליל',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const bars = 64;
      for (let i = 0; i < bars; i++) {
        const f = freq[i] / 255;
        const angle = (i / bars) * Math.PI * 2 + (t * 0.001);
        const rx = w * 0.3, ry = h * 0.1;
        const x = cx + Math.cos(angle) * rx;
        const y = cy + Math.sin(angle) * ry + h * 0.1;
        const barH = f * h * 0.4;
        ctx.fillStyle = `hsl(${(i / bars) * 360}, 100%, 50%)`;
        ctx.fillRect(x, y - barH, 4, barH);
      }
    }
  },
  {
    id: 'block_eq',
    nameEn: 'Bars: Block EQ',
    nameHe: 'ברים: איקיו בלוקים',
    draw: (ctx, w, h, freq) => {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);
      const cols = 32;
      const blockH = h / 20;
      const colW = w / cols;
      for (let i = 0; i < cols; i++) {
        const val = freq[i * 4];
        const activeBlocks = Math.floor((val / 255) * 20);
        for (let j = 0; j < 20; j++) {
          if (20 - j <= activeBlocks) {
            ctx.fillStyle = j < 5 ? '#f00' : j < 12 ? '#ff0' : '#0f0';
          } else {
            ctx.fillStyle = '#222';
          }
          ctx.fillRect(i * colW + 2, j * blockH + 2, colW - 4, blockH - 4);
        }
      }
    }
  },

  // --- 2. AMBIENCE CATEGORY ---
  {
    id: 'wmp_ambience',
    nameEn: 'Ambience: Swirl',
    nameHe: 'אווירה: מערבולת',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0, 0, 10, 0.1)';
      ctx.fillRect(0, 0, w, h);
      const avg = getAvg(freq);
      const cx = w / 2, cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.0005);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i < 5; i++) {
        const val = freq[i * 10] || 0;
        const r = (val / 255) * Math.min(w, h) * 0.6;
        const angle = i * Math.PI * 0.4 + (t * 0.001);
        ctx.quadraticCurveTo(
          Math.cos(angle) * r, Math.sin(angle) * r,
          Math.cos(angle + 0.5) * r * 1.2, Math.sin(angle + 0.5) * r * 1.2
        );
      }
      ctx.lineWidth = Math.max(2, avg * 0.1);
      ctx.strokeStyle = `hsla(${(t * 0.05) % 360}, 80%, 60%, 0.5)`;
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'ambience_water',
    nameEn: 'Ambience: Water Ripples',
    nameHe: 'אווירה: אדוות מים',
    draw: (ctx, w, h, freq, time, t) => {
      if (!state.water || state.water.w !== w) state.water = { w, ripples: [] };
      ctx.fillStyle = 'rgba(0, 10, 20, 0.1)';
      ctx.fillRect(0, 0, w, h);
      const avg = getAvg(freq);
      if (avg > 180 && Math.random() > 0.7) {
        state.water.ripples.push({ x: Math.random() * w, y: Math.random() * h, r: 0, maxR: 50 + Math.random() * 150 });
      }
      ctx.strokeStyle = '#0ff';
      for (let i = state.water.ripples.length - 1; i >= 0; i--) {
        const rip = state.water.ripples[i];
        rip.r += 2;
        ctx.lineWidth = Math.max(0.1, 3 - (rip.r / rip.maxR) * 3);
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
        ctx.stroke();
        if (rip.r > rip.maxR) state.water.ripples.splice(i, 1);
      }
    }
  },
  {
    id: 'cosmic_dust',
    nameEn: 'Ambience: Cosmic Dust',
    nameHe: 'אווירה: אבק כוכבים',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const f = freq[10] / 255;
      const r = (Math.min(w, h) * 0.4) * (1 + f);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `hsla(${(t * 0.02) % 360}, 100%, 50%, 0.05)`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'color_pulse',
    nameEn: 'Ambience: Color Pulse',
    nameHe: 'אווירה: פעימות צבע',
    draw: (ctx, w, h, freq) => {
      const avg = getAvg(freq);
      const r = freq[10];
      const g = freq[40];
      const b = freq[80];
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2; const cy = h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, (avg / 255) * Math.min(w, h) * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
  },

  // --- 3. BATTERY CATEGORY ---
  {
    id: 'battery_blobs',
    nameEn: 'Battery: Lava Lamp',
    nameHe: 'בטרייה: מנורת לבה',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        const r = 50 + (freq[i * 5] / 255) * h * 0.2;
        const x = w / 2 + Math.sin(t * 0.001 + i * 1.2) * w * 0.3;
        const y = h / 2 + Math.cos(t * 0.0013 + i * 0.8) * h * 0.3;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `hsla(${(t * 0.05 + i * 40) % 360}, 100%, 50%, 0.8)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: 'battery_solar',
    nameEn: 'Battery: Solar Flare',
    nameHe: 'בטרייה: התפרצות סולארית',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.001);
      for (let i = 0; i < 120; i++) {
        const f = freq[i] / 255;
        const angle = (i / 120) * Math.PI * 2;
        const r1 = w * 0.15;
        const r2 = r1 + f * w * 0.3;
        ctx.strokeStyle = `hsla(${20 + f * 40}, 100%, 50%, 0.5)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.strokeStyle = '#f80';
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'nebula',
    nameEn: 'Battery: Nebula',
    nameHe: 'בטרייה: ערפילית',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < 3; i++) {
        const x = cx + Math.cos(t * 0.001 + i) * (w * 0.2);
        const y = cy + Math.sin(t * 0.0013 + i) * (h * 0.2);
        const r = (freq[i * 20] / 255) * (Math.min(w, h) * 0.4) + 50;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `hsla(${(t * 0.1 + i * 50) % 360}, 100%, 50%, 0.2)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: 'energy_ring',
    nameEn: 'Battery: Energy Ring',
    nameHe: 'בטרייה: טבעת אנרגיה',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const rBase = Math.min(w, h) * 0.25;
      ctx.beginPath();
      for (let i = 0; i < time.length; i++) {
        const v = time[i] / 128.0;
        const r = rBase + (v - 1) * rBase * 0.5;
        const angle = (i / time.length) * Math.PI * 2 + (t * 0.002);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(2, h * 0.005);
      ctx.strokeStyle = `hsl(${(t * 0.1) % 360}, 100%, 60%)`;
      ctx.stroke();
    }
  },

  // --- 4. PLENOPTIC CATEGORY ---
  {
    id: 'plenoptic_tunnel',
    nameEn: 'Plenoptic: Tunnel',
    nameHe: 'פלנאופטיק: מנהרה',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < 10; i++) {
        const offset = (t * 0.002 + i) % 10;
        const scale = offset / 10;
        const r = scale * Math.max(w, h);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1, (freq[i * 5] / 255) * 10 * scale);
        ctx.strokeStyle = `hsla(${(t * 0.1 + offset * 36) % 360}, 100%, 50%, ${1 - scale})`;
        ctx.stroke();
      }
    }
  },
  {
    id: 'hypno_rings',
    nameEn: 'Plenoptic: Rings',
    nameHe: 'פלנאופטיק: טבעות היפנוטיות',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < 10; i++) {
        const val = freq[i * 5];
        const r = ((t * 0.1 + i * 50) % (Math.min(w, h) * 0.8));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1, (val / 255) * 20);
        ctx.strokeStyle = `hsla(${(i * 36) % 360}, 100%, 50%, ${1 - r / (Math.min(w, h) * 0.8)})`;
        ctx.stroke();
      }
    }
  },
  {
    id: 'plenoptic_shatter',
    nameEn: 'Plenoptic: Shatter',
    nameHe: 'פלנאופטיק: שברים',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const avg = getAvg(freq);
      for (let i = 0; i < 10; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((t * 0.001) + (i * Math.PI / 5));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const f = freq[i * 4] / 255;
        ctx.lineTo(w * 0.2 + (f * w * 0.2), -h * 0.1);
        ctx.lineTo(w * 0.3 + (f * w * 0.3), h * 0.1);
        ctx.closePath();
        ctx.fillStyle = `hsla(${(i * 36) % 360}, 100%, 50%, ${0.1 + f * 0.5})`;
        ctx.fill();
        ctx.restore();
      }
    }
  },

  // --- 5. ALCHEMY CATEGORY ---
  {
    id: 'alchemy_web',
    nameEn: 'Alchemy: Neural Web',
    nameHe: 'אלכימיה: רשת נוירונים',
    draw: (ctx, w, h, freq, time, t) => {
      if (!state.web || state.web.w !== w) {
        state.web = { w, nodes: Array.from({ length: 40 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 })) };
      }
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      const nodes = state.web.nodes;
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
        if (nodes[i].x < 0 || nodes[i].x > w) nodes[i].vx *= -1;
        if (nodes[i].y < 0 || nodes[i].y > h) nodes[i].vy *= -1;
        
        const r = (freq[i] || 0) / 255 * 20 + 2;
        ctx.fillStyle = '#0ff';
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, r, 0, Math.PI * 2);
        ctx.fill();
        
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (dx * dx + dy * dy < 15000) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${(1 - (dx * dx + dy * dy) / 15000)})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
    }
  },
  {
    id: 'kaleidoscope',
    nameEn: 'Alchemy: Kaleidoscope',
    nameHe: 'אלכימיה: קליידוסקופ',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.0002);
      for (let k = 0; k < 8; k++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i < 32; i++) {
          const v = freq[i] / 255;
          ctx.lineTo(i * (w * 0.01), v * (h * 0.2));
        }
        ctx.strokeStyle = `hsl(${(t * 0.1 + k * 45) % 360}, 100%, 50%)`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
  },
  {
    id: 'alchemy_dna',
    nameEn: 'Alchemy: DNA Helix',
    nameHe: 'אלכימיה: סליל דנ״א',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      const points = 40;
      for (let i = 0; i < points; i++) {
        const y = (i / points) * h;
        const f = freq[i] / 255;
        const phase = t * 0.002 + i * 0.2;
        const x1 = w / 2 + Math.sin(phase) * w * 0.2;
        const x2 = w / 2 + Math.sin(phase + Math.PI) * w * 0.2;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
        
        ctx.fillStyle = '#0ff'; ctx.beginPath(); ctx.arc(x1, y, 3 + f * 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0f'; ctx.beginPath(); ctx.arc(x2, y, 3 + f * 10, 0, Math.PI * 2); ctx.fill();
      }
    }
  },
  {
    id: 'psychedelic_spiral',
    nameEn: 'Alchemy: Psychedelic',
    nameHe: 'אלכימיה: פסיכדלי',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < 20; i++) {
        const f = freq[i * 2] / 255;
        ctx.beginPath();
        ctx.arc(cx, cy, (i / 20) * h * 0.5, (t * 0.001) + (i * 0.1), (t * 0.001) + (i * 0.1) + Math.PI);
        ctx.strokeStyle = `hsl(${(t * 0.1 + i * 18) % 360}, 100%, 50%)`;
        ctx.lineWidth = 2 + f * 10;
        ctx.stroke();
      }
    }
  },

  // --- 6. SPIKES CATEGORY ---
  {
    id: 'wmp_spikes',
    nameEn: 'Spikes: Symmetrical',
    nameHe: 'קוצים: סימטריים',
    draw: (ctx, w, h, freq) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cy = h / 2;
      const bars = 128;
      const step = w / bars;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      for (let i = 0; i < bars; i++) {
        const v = (freq[i] / 255) * (h * 0.4);
        ctx.lineTo(i * step, cy - v);
      }
      ctx.lineTo(w, cy);
      for (let i = bars - 1; i >= 0; i--) {
        const v = (freq[i] / 255) * (h * 0.4);
        ctx.lineTo(i * step, cy + v);
      }
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, cy - h * 0.4, 0, cy + h * 0.4);
      grad.addColorStop(0, '#00f');
      grad.addColorStop(0.5, '#fff');
      grad.addColorStop(1, '#00f');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  },
  {
    id: 'spikes_radial',
    nameEn: 'Spikes: Radial',
    nameHe: 'קוצים: רדיאלי',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const bars = 64;
      ctx.beginPath();
      for (let i = 0; i <= bars; i++) {
        const f = freq[i % bars] / 255;
        const angle = (i / bars) * Math.PI * 2 + (t * 0.0005);
        const rBase = h * 0.15;
        const rSpike = rBase + (f * h * 0.3);
        const x = cx + Math.cos(angle) * rSpike;
        const y = cy + Math.sin(angle) * rSpike;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, h * 0.1, cx, cy, h * 0.5);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(1, '#f0f');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  },

  // --- 7. MUSICAL COLORS CATEGORY ---
  {
    id: 'musical_colors_3d',
    nameEn: 'Musical Colors: 3D Wave',
    nameHe: 'צבעים מוזיקליים: גל תלת-ממד',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = `hsl(${(t * 0.05) % 360}, 100%, 50%)`;
      ctx.lineWidth = 1;
      const lines = 20;
      for (let j = 0; j < lines; j++) {
        ctx.beginPath();
        for (let i = 0; i < 64; i++) {
          const f = freq[i] / 255;
          const x = (i / 63) * w;
          const z = (j / lines) + (t * 0.0005) % (1 / lines);
          const scale = 1 / (1.5 - z);
          const px = w / 2 + (x - w / 2) * scale;
          const py = h * 0.8 - (j / lines) * h * 0.4 - f * h * 0.2 * scale;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
  },
  {
    id: 'musical_night_day',
    nameEn: 'Musical Colors: Night & Day',
    nameHe: 'צבעים מוזיקליים: לילה ויום',
    draw: (ctx, w, h, freq, time, t) => {
      const isDay = Math.floor(t / 5000) % 2 === 0;
      ctx.fillStyle = isDay ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let i = 0; i < time.length; i++) {
        const x = (i / time.length) * w;
        const y = h / 2 + ((time[i] - 128) / 128) * h * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = isDay ? '#000' : '#fff';
      ctx.stroke();
    }
  },
  {
    id: 'circular_bars',
    nameEn: 'Musical Colors: Circular EQ',
    nameHe: 'צבעים מוזיקליים: איקיו מעגלי',
    draw: (ctx, w, h, freq) => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.2;
      const bars = 64;
      for (let i = 0; i < bars; i++) {
        const val = freq[i];
        const barH = (val / 255) * (Math.min(w, h) * 0.3);
        const rads = (Math.PI * 2) * (i / bars);
        const x = cx + Math.cos(rads) * radius;
        const y = cy + Math.sin(rads) * radius;
        const xEnd = cx + Math.cos(rads) * (radius + barH);
        const yEnd = cy + Math.sin(rads) * (radius + barH);
        ctx.lineWidth = (Math.PI * 2 * radius) / bars * 0.6;
        ctx.strokeStyle = `hsl(${(i / bars) * 360}, 100%, 50%)`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(xEnd, yEnd);
        ctx.stroke();
      }
    }
  },

  // --- 8. PARTICLE CATEGORY ---
  {
    id: 'starfield',
    nameEn: 'Particle: Warp',
    nameHe: 'חלקיקים: שדה כוכבים',
    draw: (ctx, w, h, freq, time, t) => {
      if (!state.stars || state.stars.w !== w) {
        state.stars = { w, arr: Array.from({ length: 200 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() })) };
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      const avg = getAvg(freq);
      const speed = 0.005 + (avg / 255) * 0.05;
      ctx.fillStyle = '#fff';
      state.stars.arr.forEach((s: any) => {
        s.z -= speed;
        if (s.z <= 0) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; }
        const px = (s.x / s.z) * w / 2 + w / 2;
        const py = (s.y / s.z) * h / 2 + h / 2;
        const size = Math.max(0.5, (1 - s.z) * 4);
        ctx.fillRect(px, py, size, size);
      });
    }
  },
  {
    id: 'particle_fountain',
    nameEn: 'Particle: Fountain',
    nameHe: 'חלקיקים: מזרקה',
    draw: (ctx, w, h, freq, time, t) => {
      if (!state.fountain || state.fountain.w !== w) state.fountain = { w, p: [] };
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      const avg = getAvg(freq);
      if (avg > 100) {
        for (let i = 0; i < 3; i++) {
          state.fountain.p.push({ x: w / 2, y: h, vx: (Math.random() - 0.5) * 10, vy: -10 - (avg / 255) * 20, c: `hsl(${Math.random() * 360}, 100%, 60%)` });
        }
      }
      for (let i = state.fountain.p.length - 1; i >= 0; i--) {
        const p = state.fountain.p[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // gravity
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 4, 4);
        if (p.y > h) state.fountain.p.splice(i, 1);
      }
    }
  },
  {
    id: 'particle_vortex',
    nameEn: 'Particle: Vortex',
    nameHe: 'חלקיקים: מערבולת',
    draw: (ctx, w, h, freq, time, t) => {
      if (!state.vortex || state.vortex.w !== w) {
        state.vortex = { w, p: Array.from({ length: 200 }, (_, i) => ({ angle: Math.random() * Math.PI * 2, dist: Math.random() * w / 2 })) };
      }
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < state.vortex.p.length; i++) {
        const p = state.vortex.p[i];
        const f = freq[i % freq.length] / 255;
        p.angle += 0.02 + f * 0.05;
        const x = cx + Math.cos(p.angle) * p.dist;
        const y = cy + Math.sin(p.angle) * p.dist;
        ctx.fillStyle = `hsl(${(p.dist / w) * 360 + t * 0.05}, 100%, 50%)`;
        const s = 1 + f * 4;
        ctx.fillRect(x, y, s, s);
      }
    }
  },

  // --- 9. RETRO CATEGORY ---
  {
    id: 'matrix_rain',
    nameEn: 'Retro: Digital Rain',
    nameHe: 'רטרו: גשם דיגיטלי',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, w, h);
      if (!state.matrix || state.matrix.w !== w) {
        const cols = Math.floor(w / 20);
        state.matrix = { w, drops: new Array(cols).fill(0) };
      }
      const avg = getAvg(freq);
      const speed = 1 + (avg / 255) * 10;
      ctx.fillStyle = '#0f0';
      ctx.font = '20px monospace';
      for (let i = 0; i < state.matrix.drops.length; i++) {
        const text = String.fromCharCode(Math.random() * 128);
        const x = i * 20;
        const y = state.matrix.drops[i] * 20;
        ctx.fillText(text, x, y);
        if (y > h && Math.random() > 0.95) state.matrix.drops[i] = 0;
        state.matrix.drops[i] += speed * 0.2;
      }
    }
  },
  {
    id: 'neon_grid',
    nameEn: 'Retro: Neon Grid',
    nameHe: 'רטרו: רשת ניאון',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = '#050015';
      ctx.fillRect(0, 0, w, h);
      const avg = getAvg(freq);
      const horizon = h * 0.4;
      ctx.strokeStyle = '#f0f';
      ctx.lineWidth = Math.max(1, h * 0.002);
      
      const lines = 20;
      for (let i = 0; i <= lines; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2, horizon);
        const destX = (i / lines) * w * 3 - w;
        ctx.lineTo(destX, h);
        ctx.stroke();
      }
      const hLines = 10;
      const offset = (t * 0.05 + avg * 0.1) % (h / hLines);
      for (let i = 0; i < hLines; i++) {
        const y = horizon + Math.pow(i / hLines, 2) * (h - horizon) + offset;
        if (y < h) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(w / 2, horizon, Math.min(w, h) * 0.15 + (avg * 0.2), Math.PI, 0);
      const sGrad = ctx.createLinearGradient(0, horizon - h * 0.2, 0, horizon);
      sGrad.addColorStop(0, '#ff0');
      sGrad.addColorStop(1, '#f0f');
      ctx.fillStyle = sGrad;
      ctx.fill();
    }
  },
  {
    id: 'laser_show',
    nameEn: 'Retro: Laser Show',
    nameHe: 'רטרו: מופע לייזרים',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      const avg = getAvg(freq);
      if (avg > 150 && Math.random() > 0.5) {
        ctx.beginPath();
        if (Math.random() > 0.5) {
          const y = Math.random() * h;
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        } else {
          const x = Math.random() * w;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        ctx.strokeStyle = `hsl(${Math.random() * 360}, 100%, 60%)`;
        ctx.lineWidth = Math.max(1, avg * 0.05);
        ctx.stroke();
      }
    }
  },
  {
    id: 'crt_bars',
    nameEn: 'Retro: CRT Bars',
    nameHe: 'רטרו: פסי מסך צבעוניים',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const colors = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'];
      const barW = w / colors.length;
      for (let i = 0; i < colors.length; i++) {
        const f = freq[i * 10] / 255;
        ctx.fillStyle = colors[i];
        ctx.globalAlpha = 0.2 + f * 0.8;
        ctx.fillRect(i * barW, 0, barW, h);
      }
      ctx.globalAlpha = 1.0;
      // scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }
    }
  },
  {
    id: 'pixel_invaders',
    nameEn: 'Retro: Pixel Invaders',
    nameHe: 'רטרו: פולשים מהחלל',
    draw: (ctx, w, h, freq, time, t) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const s = Math.min(w, h) * 0.05;
      const f = getAvg(freq) / 255;
      ctx.fillStyle = `hsl(${(t * 0.1) % 360}, 100%, 50%)`;
      // Draw a pixelated invader that scales with bass
      const pattern = [
        [0,0,1,0,0,0,1,0,0],
        [0,0,0,1,0,1,0,0,0],
        [0,0,1,1,1,1,1,0,0],
        [0,1,1,0,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,1,0,1],
        [0,0,0,1,1,1,0,0,0]
      ];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + f, 1 + f);
      for (let y = 0; y < pattern.length; y++) {
        for (let x = 0; x < pattern[y].length; x++) {
          if (pattern[y][x]) {
            ctx.fillRect((x - 4) * s, (y - 4) * s, s, s);
          }
        }
      }
      ctx.restore();
    }
  },
  
  // --- 10. WAVES CATEGORY ---
  {
    id: 'radial_wave',
    nameEn: 'Wave: Radial',
    nameHe: 'גל: רדיאלי',
    draw: (ctx, w, h, freq, time) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.25;
      ctx.beginPath();
      for (let i = 0; i < time.length; i++) {
        const v = time[i] / 128.0;
        const r = baseR + (v * baseR * 0.5);
        const angle = (i / time.length) * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = Math.max(2, h * 0.005);
      ctx.strokeStyle = '#0ff';
      ctx.stroke();
    }
  }
];
