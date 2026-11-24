import {mime, readAppFiles} from './storage.js';

const virtualOrigin = 'https://werkraum.invalid';
const scriptFile = /\.(?:m?js)$/i;
const htmlFile = /\.html?$/i;
const moduleKey = path => '@werkraum/' + encodeURIComponent(path);
const fileURL = path => new URL('/' + path.split('/').map(encodeURIComponent).join('/'),virtualOrigin);
const asScript = value => JSON.stringify(value).replaceAll('<','\\u003c');

function localReference(value, base) {
  if (!value || /^\s*(?:#|\/\/|[\w+.-]+:)/.test(value)) return null;
  try {
    const url = new URL(value,base);
    if (url.origin !== virtualOrigin) return null;
    return {path:decodeURIComponent(url.pathname.slice(1)),hash:url.hash};
  } catch { return null; }
}

function appNetwork(files,base) {
  const find = input => {
    if (typeof input !== 'string' && !(input instanceof URL)) return undefined;
    const value = String(input);
    try {
      const url = new URL(value,base);
      if (url.origin !== new URL(base).origin) return undefined;
      return files[decodeURIComponent(url.pathname.slice(1))];
    } catch { return undefined; }
  };
  const originalFetch = window.fetch;
  window.fetch = function(input,options) {
    return originalFetch.call(this,find(input) ?? input,options);
  };
  const xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method,url,...args) {
    return xhrOpen.call(this,method,find(url) ?? url,...args);
  };
  if (window.Worker) {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(url,options) { super(find(url) ?? url,options); }
    };
  }
}

function cssReferences(css,resolve) {
  return css
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s'")]+))\s*\)/gi,
      (whole,double,single,bare) => {
        const url = resolve(double ?? single ?? bare);
        return url ? 'url("' + url + '")' : whole;
      })
    .replace(/(@import\s+)(["'])([^"']+)\2/gi,(whole,lead,quote,path) => {
      const url = resolve(path);
      return url ? lead + quote + url + quote : whole;
    });
}

function moduleReferences(code,resolve,resolveAsset) {
  return code.replace(
    /((?:\b(?:import|export)\s+(?:(?:[^;"'`]*?)\bfrom\s*)?|\bimport\s*\(\s*))(["'])([^"'\n]+)\2/g,
    (whole,lead,quote,path) => {
      const mapped = resolve(path);
      return mapped ? lead + quote + mapped + quote : whole;
    }
  ).replace(/new\s+URL\s*\(\s*(["'])([^"'\n]+)\1\s*,\s*import\.meta\.url\s*\)/g,(whole,quote,path) => {
    const mapped = resolveAsset(path);
    return mapped ? 'new URL(' + JSON.stringify(mapped) + ')' : whole;
  });
}

export async function loadLocalApp(id,signal) {
  const files = new Map((await readAppFiles(id)).map(file => [file.path,file.blob]));
  signal.throwIfAborted();
  const assets = new Map();
  const styles = new Map();
  const modules = new Map();
  const allocated = new Set();
  const objectURL = (content,type) => {
    signal.throwIfAborted();
    const url = URL.createObjectURL(new Blob([content],{type}));
    allocated.add(url);
    return url;
  };
  signal.addEventListener('abort',() => {
    for (const url of allocated) URL.revokeObjectURL(url);
  },{once:true});

  const getFile = (value,base) => {
    const ref = localReference(value,base);
    if (!ref) return null;
    if (!files.has(ref.path)) ref.path += (ref.path && !ref.path.endsWith('/') ? '/' : '') + 'index.html';
    return files.has(ref.path) ? ref : null;
  };
  const assetURL = (value,base) => {
    const ref = getFile(value,base);
    return ref && assets.get(ref.path) + ref.hash;
  };
  const moduleName = (value,base) => {
    if (!value.startsWith('.') && !value.startsWith('/')) return null;
    const ref = getFile(value,base);
    return ref && (scriptFile.test(ref.path) ? moduleKey(ref.path) : assetURL(value,base));
  };

  for (const [path,blob] of files) {
    assets.set(path,objectURL(blob,mime(path) || blob.type || 'application/octet-stream'));
  }

  async function loadStyle(path,parents = []) {
    if (parents.includes(path)) return assets.get(path);
    if (styles.has(path)) return styles.get(path);
    const base = fileURL(path);
    const css = await files.get(path).text();
    signal.throwIfAborted();
    const nested = new Map();
    const mentions = new Set();
    cssReferences(css,value => { mentions.add(value); });
    for (const value of mentions) {
      const ref = getFile(value,base);
      if (ref && /\.css$/i.test(ref.path)) {
        nested.set(value,await loadStyle(ref.path,[...parents,path]));
      }
    }
    const url = objectURL(cssReferences(css,value => nested.get(value) ?? assetURL(value,base)),'text/css');
    styles.set(path,url);
    return url;
  }

  async function moduleURL(path) {
    if (modules.has(path)) return modules.get(path);
    const base = fileURL(path);
    const code = await files.get(path).text();
    signal.throwIfAborted();
    const url = objectURL(moduleReferences(code,value => moduleName(value,base),value => assetURL(value,base)),'text/javascript');
    modules.set(path,url);
    return url;
  }

  async function page(path) {
    const source = files.get(path);
    if (!source) throw new Error('Die Startdatei fehlt in der gespeicherten App.');
    const doc = new DOMParser().parseFromString(await source.text(),'text/html');
    signal.throwIfAborted();
    const originalBase = doc.querySelector('base[href]');
    const base = new URL(originalBase?.getAttribute('href') || fileURL(path),fileURL(path));
    if (originalBase && base.origin === virtualOrigin) originalBase.removeAttribute('href');
    const imports = {};
    const hasModules = doc.querySelector('script[type=module], link[rel=modulepreload]');
    if (hasModules) {
      for (const assetPath of files.keys()) {
        if (scriptFile.test(assetPath)) imports[moduleKey(assetPath)] = await moduleURL(assetPath);
      }
    }
    let importMap = doc.querySelector('script[type=importmap]');
    if (importMap) {
      try {
        const map = JSON.parse(importMap.textContent);
        for (const [key,value] of Object.entries(map.imports ?? {})) {
          if (typeof value !== 'string') continue;
          const ref = getFile(value,base);
          if (ref) map.imports[key] = modules.get(ref.path) ?? assets.get(ref.path);
        }
        map.imports = {...map.imports,...imports};
        importMap.textContent = asScript(map);
      } catch { importMap = null; }
    }
    if (!importMap && Object.keys(imports).length) {
      importMap = doc.createElement('script');
      importMap.type = 'importmap';
      importMap.textContent = asScript({imports});
      doc.head.prepend(importMap);
    }

    for (const el of doc.querySelectorAll('[src], [href], [poster], [data], [srcset], [style], style, script[type=module]')) {
      for (const key of ['src','href','poster','data']) {
        const value = el.getAttribute(key);
        if (!value || el.localName === 'base' || (key === 'data' && el.localName !== 'object')) continue;
        const ref = getFile(value,base);
        if (!ref) continue;
        if (key === 'href' && ['a','area'].includes(el.localName) && htmlFile.test(ref.path) && !el.hasAttribute('download')) {
          el.setAttribute('data-werkraum-page',ref.path);
          el.setAttribute('href',ref.hash || '#');
          continue;
        }
        let url = assets.get(ref.path);
        if (el.localName === 'link' && /\bstylesheet\b/i.test(el.rel)) url = await loadStyle(ref.path);
        if ((el.localName === 'script' && el.type === 'module') || el.rel === 'modulepreload') {
          if (scriptFile.test(ref.path)) url = await moduleURL(ref.path);
        }
        el.setAttribute(key,url + ref.hash);
      }
      const srcset = el.getAttribute('srcset');
      if (srcset && !/\bdata:/i.test(srcset)) {
        el.setAttribute('srcset',srcset.split(',').map(part => part.trim().replace(/^\S+/,value => assetURL(value,base) ?? value)).join(', '));
      }
      if (el.hasAttribute('style')) el.setAttribute('style',cssReferences(el.getAttribute('style'),value => assetURL(value,base)));
      if (el.localName === 'style') el.textContent = cssReferences(el.textContent,value => assetURL(value,base));
      if (el.localName === 'script' && el.type === 'module' && !el.hasAttribute('src')) {
        el.textContent = moduleReferences(el.textContent,value => moduleName(value,base),value => assetURL(value,base));
      }
    }

    if (files.size > 1 && base.origin === virtualOrigin) {
      const bootstrap = doc.createElement('script');
      bootstrap.textContent = '(' + appNetwork.toString() + ')(' + asScript(Object.fromEntries(assets)) + ',' + asScript(base.href) + ')';
      doc.head.prepend(bootstrap);
    }
    const doctype = doc.doctype ? new XMLSerializer().serializeToString(doc.doctype) : '';
    return doctype + doc.documentElement.outerHTML;
  }
  return page;
}

export async function showLocalApp(frame,id,entry,signal,onError) {
  const page = await loadLocalApp(id,signal);
  async function navigate(path,hash = '') {
    const source = await page(path);
    signal.throwIfAborted();
    frame.addEventListener('load',() => {
      const doc = frame.contentDocument;
      if (!doc) return;
      if (hash) {
        try { doc.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); }
        catch { /* An invalid URL fragment has no scroll target. */ }
      }
      doc.addEventListener('click',event => {
        const link = event.target.closest?.('[data-werkraum-page]');
        if (!link || event.defaultPrevented) return;
        event.preventDefault();
        void navigate(link.dataset.werkraumPage,link.getAttribute('href')).catch(onError);
      });
    },{once:true});
    frame.srcdoc = source;
  }
  await navigate(entry);
}
