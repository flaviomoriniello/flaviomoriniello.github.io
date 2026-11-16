export const CHARSETS = {
  classic: '@%#*+=-:. ', terminal: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ',
  block: '█▓▒░ ', unicode: '█▉▊▋▌▍▎▏· ', minimal: '@+:. ', braille: '⣿⣷⣶⣦⣤⣀⡀ ', custom: '@%#*+=-:. ',
};
export const DEFAULTS = {
  preset: 'classic', chars: CHARSETS.classic, invert: false, art: 'ascii', algorithm: 'luminance', dithering: 'none',
  columns: 180, rows: 68, lockAspect: true, aspect: 0.52, fontSize: 12, spacing: 0, sampleX: 2, sampleY: 2,
  font: 'Consolas', customFont: '', colorMode: 'mono', foreground: '#c8e6b0', background: '#101710', paletteSize: 8,
  customPalette: '', terminal: 'green', brightness: 0, contrast: 12, gamma: 1, saturation: 100, exposure: 0,
  sharpness: 0, threshold: 0, noise: 0, autoResize: true, supersampling: 2, antialias: true, hqContrast: true, artifacts: true,
};
export const TERMINALS = {
  green: ['#b8e994', '#101710'], amber: ['#ffbf60', '#1a1208'], white: ['#e9eee9', '#131716'],
  matrix: ['#31ff72', '#020b05'], cyberpunk: ['#fa70d4', '#150f22'], hacker: ['#57e0b0', '#061512'],
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function gridSize(settings, width, height, preview = false) {
  let columns = clamp(Math.round(settings.columns), 16, 800);
  let rows = settings.lockAspect ? Math.round(columns * height / width * settings.aspect) : Math.round(settings.rows);
  rows = clamp(rows, 8, 600);
  if (preview && columns > 160) { rows = Math.max(8, Math.round(rows * 160 / columns)); columns = 160; }
  return { columns, rows };
}
// Imported preset files are untrusted: whitelist keys and constrain expensive dimensions.
export function normalizeSettings(input) {
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof input?.[key] === typeof DEFAULTS[key]) out[key] = input[key];
  }
  const ranges = { columns:[16,800], rows:[8,600], aspect:[.25,1], fontSize:[6,32], spacing:[-1,5], sampleX:[1,4], sampleY:[1,4], brightness:[-100,100], contrast:[-100,100], gamma:[.2,3], saturation:[0,200], exposure:[-3,3], sharpness:[0,100], threshold:[0,255], noise:[0,100], supersampling:[1,3] };
  for (const [key,[min,max]] of Object.entries(ranges)) out[key] = clamp(Number.isFinite(out[key]) ? out[key] : DEFAULTS[key], min, max);
  for (const [key,values] of Object.entries({ art:['ascii','ansi','unicode','block','braille','mosaic'], algorithm:['luminance','edge','adaptive','hdr'], dithering:['none','floyd','atkinson','bayer'], colorMode:['mono','original','palette','terminal'], preset:Object.keys(CHARSETS), terminal:Object.keys(TERMINALS) })) if (!values.includes(out[key])) out[key] = DEFAULTS[key];
  for (const key of ['foreground','background']) if (!/^#[0-9a-f]{6}$/i.test(out[key])) out[key] = DEFAULTS[key];
  out.paletteSize = [2,4,8,16,32].includes(out.paletteSize) ? out.paletteSize : 8;
  out.chars = Array.from(out.chars.replace(/[\r\n\t\x00-\x1f]/g, '')).slice(0,256).join('') || DEFAULTS.chars;
  out.customFont = out.customFont.replace(/[^\w \-]/g, '').slice(0,80);
  if (!['Courier New','Consolas','Fira Code','JetBrains Mono','Cascadia Code','Monaco','monospace','custom'].includes(out.font)) out.font='Consolas';
  out.customPalette = out.customPalette.slice(0,2048);
  return out;
}
