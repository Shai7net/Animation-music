// Helper to generate a vibrant procedural demo video clip in browser for instant testing
export function generateProceduralDemoVideoBlob(): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(new Blob([], { type: 'video/webm' }));
      return;
    }

    const stream = canvas.captureStream(30);
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.start();

    const durationSec = 6;
    const totalFrames = durationSec * 30;
    let frame = 0;

    const renderNext = () => {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }

      const t = frame / 30;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Dark futuristic background
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, w, h);

      // Rotating neon tunnel / geometric wireframe
      const rings = 18;
      for (let r = 0; r < rings; r++) {
        const progress = (r / rings + (t * 0.4) % 1) % 1;
        const radius = Math.pow(progress, 2.2) * (w * 0.7);
        const hue = (t * 60 + r * 20) % 360;
        
        ctx.strokeStyle = `hsla(${hue}, 90%, 60%, ${0.2 + progress * 0.8})`;
        ctx.lineWidth = 2 + progress * 8;
        
        ctx.beginPath();
        const sides = 6;
        const rot = t * 0.5 + progress * 1.5;
        for (let s = 0; s < sides; s++) {
          const angle = rot + (s / sides) * Math.PI * 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * (radius * 0.65);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Cyber Grid Floor
      const horizonY = cy + 40;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += 60) {
        const offset = ((t * 80) % 60);
        ctx.beginPath();
        ctx.moveTo(cx + (x - cx) * 0.1, horizonY);
        ctx.lineTo(cx + (x - cx) * 2.5, h);
        ctx.stroke();
      }
      for (let y = horizonY; y <= h; y += 25) {
        const p = (y - horizonY) / (h - horizonY);
        const lineY = horizonY + Math.pow(p, 1.8) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(w, lineY);
        ctx.stroke();
      }

      // Center glowing neon icon / text
      ctx.save();
      ctx.translate(cx, cy - 30);
      ctx.rotate(Math.sin(t * 2) * 0.1);
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('⚡ RETROVIZ VJ CLIP', 0, 0);
      ctx.restore();

      frame++;
      setTimeout(renderNext, 1000 / 60);
    };

    renderNext();
  });
}
