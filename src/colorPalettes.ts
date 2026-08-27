export interface ColorPalette {
  id: string;
  nameEn: string;
  nameHe: string;
  colors: string[];
  threeColors: number[];
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'cyber_neon',
    nameEn: 'Cyber Neon',
    nameHe: 'סייבר נאון',
    colors: ['#00FFFF', '#FF007F', '#7928CA', '#0070F3', '#39FF14'],
    threeColors: [0x00ffff, 0xff007f, 0x7928ca, 0x0070f3, 0x39ff14]
  },
  {
    id: 'synthwave_sunset',
    nameEn: 'Synthwave Sunset',
    nameHe: 'שקיעת סינת\'ווייב',
    colors: ['#FF007F', '#FF7700', '#FFDD00', '#8A2BE2', '#FF0055'],
    threeColors: [0xff007f, 0xff7700, 0xffdd00, 0x8a2be2, 0xff0055]
  },
  {
    id: 'matrix_emerald',
    nameEn: 'Matrix Emerald',
    nameHe: 'מטריקס אמרלד',
    colors: ['#00FF66', '#00CC44', '#003311', '#55FF99', '#00FFCC'],
    threeColors: [0x00ff66, 0x00cc44, 0x003311, 0x55ff99, 0x00ffcc]
  },
  {
    id: 'toxic_acid',
    nameEn: 'Toxic Acid',
    nameHe: 'חומצה טוקסית',
    colors: ['#CCFF00', '#FF0055', '#9900FF', '#00FFAA', '#FFFF00'],
    threeColors: [0xccff00, 0xff0055, 0x9900ff, 0x00ffaa, 0xffff00]
  },
  {
    id: 'deep_space',
    nameEn: 'Deep Space Void',
    nameHe: 'חלל עמוק וסגול',
    colors: ['#4A00E0', '#8E2DE2', '#00D2FF', '#FFFFFF', '#1A0B2E'],
    threeColors: [0x4a00e0, 0x8e2de2, 0x00d2ff, 0xffffff, 0x1a0b2e]
  },
  {
    id: 'inferno_fire',
    nameEn: 'Inferno Fire',
    nameHe: 'אינפרנו אש',
    colors: ['#FF2200', '#FF6600', '#FFAA00', '#FF0033', '#FFEE55'],
    threeColors: [0xff2200, 0xff6600, 0xffaa00, 0xff0033, 0xffee55]
  }
];

export function getPalette(id: string): ColorPalette {
  return colorPalettes.find(p => p.id === id) || colorPalettes[0];
}
