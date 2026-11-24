import {readAsset, mime, cleanPath} from './storage.js';

const prefix = new URL('./__werkraum_apps__/', self.registration.scope);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== prefix.origin) return;
  if (url.pathname.startsWith(prefix.pathname)) {
    event.respondWith(serve(url, event.request));
  } else if (event.clientId && event.request.method === 'GET') {
    event.respondWith(readFromAppRoot(event, url));
  }
});

async function readFromAppRoot(event, url) {
  const client = await self.clients.get(event.clientId);
  if (client) {
    const clientUrl = new URL(client.url);
    if (clientUrl.pathname.startsWith(prefix.pathname)) {
      const id = clientUrl.pathname.slice(prefix.pathname.length).split('/')[0];
      const virtual = new URL(prefix.href + id + url.pathname);
      const response = await serve(virtual, event.request);
      if (response.ok) return response;
    }
  }
  return fetch(event.request);
}

async function serve(url, request) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Methode nicht erlaubt.', {status:405, headers});
    }
    const [id, ...parts] = url.pathname.slice(prefix.pathname.length).split('/').map(decodeURIComponent);
    if (!parts.length || parts.at(-1) === '') {
      if (parts.at(-1) === '') parts.pop();
      parts.push('index.html');
    }
    const path = parts.join('/');
    const file = id && cleanPath(path) ? await readAsset(id, path) : null;
    if (!file) {
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      return new Response('Datei im App-Ordner nicht gefunden: ' + path, {status:404, headers});
    }
    headers.set('Content-Type', mime(path) || file.blob.type || 'application/octet-stream');
    headers.set('Content-Length', String(file.blob.size));
    return new Response(request.method === 'HEAD' ? null : file.blob, {headers});
  } catch {
    return new Response('App-Datei konnte nicht geladen werden.', {status:500, headers});
  }
}
