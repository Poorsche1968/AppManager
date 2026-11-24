const maxPngBytes = 512 * 1024;
const maxBase64Length = Math.ceil(maxPngBytes / 3) * 4;
const pngPrefix = 'data:image/png;base64,';

async function loadPng(encoded, label) {
  const invalid = new Error(label + ' muss ein gültiges PNG sein, maximal 512 KB und 2048 × 2048 Pixel.');
  if (typeof encoded !== 'string' || encoded.length > maxBase64Length) throw invalid;
  let bytes;
  try { bytes = atob(encoded); } catch { throw invalid; }
  if (bytes.length < 24 || bytes.length > maxPngBytes || !bytes.startsWith('\x89PNG\r\n\x1a\n') ||
      bytes.slice(12, 16) !== 'IHDR') throw invalid;
  const dimensions = new DataView(Uint8Array.from(bytes.slice(16, 24), byte => byte.charCodeAt(0)).buffer);
  const width = dimensions.getUint32(0);
  const height = dimensions.getUint32(4);
  if (!width || !height || width > 2048 || height > 2048) throw invalid;
  const image = new Image();
  image.src = pngPrefix + btoa(bytes);
  try { await image.decode(); } catch { throw invalid; }
  return image;
}

function renderTabIcon(image, crop) {
  const {x, y, width, height} = crop ?? {x:0, y:0, width:image.width, height:image.height};
  if (![x,y,width,height].every(Number.isSafeInteger) || x < 0 || y < 0 || width < 1 || height < 1 ||
      x + width > image.width || y + height > image.height) {
    throw new Error('Der Ausschnitt für das Tab-Symbol liegt außerhalb des Bildes.');
  }

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const scale = 52 / Math.max(width,height);
  const drawnWidth = width * scale;
  // Wide wordmarks need some extra height to remain readable at 16 pixels.
  const drawnHeight = Math.max(16,height * scale);
  context.filter = 'grayscale(1) contrast(1.4)';
  context.drawImage(image,x,y,width,height,(size - drawnWidth) / 2,(size - drawnHeight) / 2,drawnWidth,drawnHeight);
  context.filter = 'none';

  const {data} = context.getImageData(0,0,size,size);
  let brightness = 0;
  let opacity = 0;
  for (let i = 0; i < data.length; i += 4) {
    brightness += data[i] * data[i + 3];
    opacity += data[i + 3];
  }
  if (!opacity) throw new Error('Das Tab-Symbol muss sichtbare Bildpunkte enthalten.');
  const lightMark = brightness >= opacity * 128;
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = lightMark ? '#000' : '#fff';
  context.strokeStyle = lightMark ? '#fff' : '#000';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(2,2,60,60,12);
  context.stroke();
  context.fill();
  return canvas.toDataURL('image/png');
}

export async function readBrandingFile(file) {
  if (file.size > 2 * maxBase64Length + 2048) throw new Error('Die Logo-Datei ist zu groß.');
  let profile;
  try { profile = JSON.parse(await file.text()); }
  catch { throw new Error('Die Logo-Datei konnte nicht als JSON gelesen werden.'); }
  if (profile?.format !== 'werkraum-branding' || profile.version !== 1 ||
      typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 120) {
    throw new Error('Das ist keine gültige Werkraum-Logo-Datei.');
  }
  const logo = await loadPng(profile.logoPng,'Das Logo');
  const tab = profile.tabPng === undefined ? logo : await loadPng(profile.tabPng,'Das Tab-Symbol');
  return {name:profile.name.trim(), logo:logo.src, tab:renderTabIcon(tab, profile.tabCrop)};
}
