import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';

export interface ButterchurnInstance {
  visualizer: any;
  render: () => void;
  setRendererSize: (w: number, h: number) => void;
  loadPreset: (presetName: string, blendTime?: number) => void;
  loadRandomPreset: (blendTime?: number) => string;
  nextPreset: (blendTime?: number) => string;
  prevPreset: (blendTime?: number) => string;
  getCurrentPresetName: () => string;
  getPresetNames: () => string[];
  destroy: () => void;
}

export function createButterchurnVisualizer(
  audioCtx: AudioContext,
  sourceNode: AudioNode,
  canvas: HTMLCanvasElement
): ButterchurnInstance {
  const presets = butterchurnPresets.getPresets();
  const presetNames = Object.keys(presets);

  const visualizer = butterchurn.createVisualizer(audioCtx, canvas, {
    width: canvas.width,
    height: canvas.height,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    mesh_width: 32,
    mesh_height: 24
  });

  visualizer.connectAudio(sourceNode);

  // Pick a vibrant default preset or famous favorite
  let currentIndex = 0;
  const preferred = presetNames.findIndex(p => p.toLowerCase().includes('flexi') || p.toLowerCase().includes('martin') || p.toLowerCase().includes('geiss'));
  if (preferred !== -1) currentIndex = preferred;

  let currentPresetName = presetNames[currentIndex] || presetNames[0];
  if (currentPresetName && presets[currentPresetName]) {
    visualizer.loadPreset(presets[currentPresetName], 0.0);
  }

  return {
    visualizer,
    render: () => {
      visualizer.render();
    },
    setRendererSize: (w: number, h: number) => {
      visualizer.setRendererSize(w, h);
    },
    loadPreset: (name: string, blendTime = 2.0) => {
      if (presets[name]) {
        currentPresetName = name;
        currentIndex = presetNames.indexOf(name);
        visualizer.loadPreset(presets[name], blendTime);
      }
    },
    loadRandomPreset: (blendTime = 2.0) => {
      const idx = Math.floor(Math.random() * presetNames.length);
      currentIndex = idx;
      currentPresetName = presetNames[idx];
      visualizer.loadPreset(presets[currentPresetName], blendTime);
      return currentPresetName;
    },
    nextPreset: (blendTime = 2.0) => {
      currentIndex = (currentIndex + 1) % presetNames.length;
      currentPresetName = presetNames[currentIndex];
      visualizer.loadPreset(presets[currentPresetName], blendTime);
      return currentPresetName;
    },
    prevPreset: (blendTime = 2.0) => {
      currentIndex = (currentIndex - 1 + presetNames.length) % presetNames.length;
      currentPresetName = presetNames[currentIndex];
      visualizer.loadPreset(presets[currentPresetName], blendTime);
      return currentPresetName;
    },
    getCurrentPresetName: () => currentPresetName,
    getPresetNames: () => presetNames,
    destroy: () => {
      try {
        if (visualizer && visualizer.disconnectAudio) {
          visualizer.disconnectAudio();
        }
      } catch (e) {
        console.warn('Butterchurn destroy error:', e);
      }
    }
  };
}
