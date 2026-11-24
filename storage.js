let connection;
export function database() {
  return connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('werkraum-dashboard', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state');
      request.result.createObjectStore('files', {keyPath: ['app', 'path']});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const result = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transactionDone = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onabort = () => reject(tx.error ?? new Error('Speichern wurde abgebrochen.'));
});

export async function readBranding() {
  const db = await database();
  return result(db.transaction('state').objectStore('state').get('branding'));
}

export async function writeBranding(branding) {
  const db = await database();
  const tx = db.transaction('state', 'readwrite');
  const done = transactionDone(tx);
  const store = tx.objectStore('state');
  if (branding) store.put(branding, 'branding');
  else store.delete('branding');
  return done;
}

export async function readWorkspace(includeFiles = false) {
  const db = await database();
  const tx = db.transaction(['state', 'files']);
  const state = result(tx.objectStore('state').get('current'));
  const files = includeFiles ? result(tx.objectStore('files').getAll()) : [];
  const values = await Promise.all([state, files]);
  return {state: values[0], files: values[1]};
}

export async function writeWorkspace(state, {files = [], remove = [], replace = false} = {}) {
  const db = await database();
  const tx = db.transaction(['state', 'files'], 'readwrite');
  const done = transactionDone(tx);
  const assets = tx.objectStore('files');
  if (replace) assets.clear();
  for (const id of remove) {
    assets.delete(IDBKeyRange.bound([id], [id, []], false, true));
  }
  for (const file of files) assets.put(file);
  tx.objectStore('state').put(state, 'current');
  return done;
}

export async function readAsset(id, path) {
  const db = await database();
  return result(db.transaction('files').objectStore('files').get([id, path]));
}

export async function readAppFiles(id) {
  const db = await database();
  const range = IDBKeyRange.bound([id], [id, []], false, true);
  return result(db.transaction('files').objectStore('files').getAll(range));
}

export const mime = path => ({
  html:'text/html', htm:'text/html', css:'text/css', js:'text/javascript',
  mjs:'text/javascript', json:'application/json', webmanifest:'application/manifest+json',
  svg:'image/svg+xml', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
  webp:'image/webp', avif:'image/avif', gif:'image/gif', ico:'image/x-icon',
  woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf', otf:'font/otf',
  wasm:'application/wasm', pdf:'application/pdf', csv:'text/csv', txt:'text/plain',
  mp4:'video/mp4', webm:'video/webm', mp3:'audio/mpeg', ogg:'audio/ogg', wav:'audio/wav'
})[path.split('.').pop().toLowerCase()];

export const cleanPath = path => typeof path === 'string' &&
  path.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes('\\'));
