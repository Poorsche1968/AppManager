const keys = ['bg','panel','tile','side','sideText','text','muted','accent','button','buttonText','border'];
export const colorFields = Object.fromEntries(keys.map((key, i) => [key, [
  'Hintergrund','Kopfleiste und Dialoge','Kacheln','Seitenleiste','Text der Seitenleiste',
  'Text','Sekundärer Text','Akzent','Schaltflächen','Text der Schaltflächen',
  'Rahmen'
][i]]));
const palette = values => Object.fromEntries(keys.map((key, i) => [key, '#' + values.split(' ')[i]]));
export const presets = {
  forest:{name:'Waldgrün',light:palette('f3f5f1 fbfcfa ffffff 112926 e5f1e9 182b26 566860 bce986 205e4e ffffff dbe3da'),
    dark:palette('111a17 18231e 1c2b24 0c1813 e4f3e9 ecf5ef acbeb2 bce986 bce986 172a17 374a40')},
  coast:{name:'Küste',light:palette('edf3f7 f7fbff ffffff 142b40 e2f0ff 192d3f 506577 a4def3 1c537c ffffff d2dfe7'),
    dark:palette('131c28 1a2837 203143 111a27 e2f0ff eef8ff aac0d0 a4def3 a4def3 132d3d 374d62')},
  clay:{name:'Terrakotta',light:palette('f8f1ea fdf9f5 ffffff 452c28 ffede0 412a26 725650 f7bb93 884530 ffffff e7d5ca'),
    dark:palette('251917 30201d 392823 1c1210 ffebe1 fff1e7 d5b9ad f7bb93 f7bb93 381d15 57403b')},
  ink:{name:'Graphit',light:palette('eff0f2 f9fafb ffffff 26282d f3f3f5 212329 585e69 d9e1ef 393f4b ffffff d9dce2'),
    dark:palette('18191c 202226 282b32 141519 f0f2f6 f4f5f8 b8bcc6 d9e1ef d9e1ef 282b32 444852')}
};
export const defaultSettings = () => ({mode:'system', preset:'ink', colors:{light:{},dark:{}}, collapsed:matchMedia('(max-width: 480px)').matches});
export function themeMode(settings) {
  return settings.mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.mode;
}
export function currentColors(settings) {
  const mode = themeMode(settings);
  return {...presets[settings.preset][mode], ...settings.colors[mode]};
}
export function applyTheme(settings) {
  const colors = currentColors(settings);
  const root = document.documentElement;
  root.dataset.mode = themeMode(settings);
  for (const [key, value] of Object.entries(colors)) setThemeColor(key,value);
}

export function setThemeColor(key,value) {
  const {style} = document.documentElement;
  style.setProperty('--' + key,value);
  if (key === 'side') style.setProperty('--brandBackdrop',contrastInk(value)==='#ffffff' ? 'transparent' : '#142b40');
}

function contrastInk(color) {
  const rgb = color.slice(1).match(/../g).map(part => parseInt(part,16) / 255);
  const [red,green,blue] = rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return red * .2126 + green * .7152 + blue * .0722 > .179 ? '#111111' : '#ffffff';
}
