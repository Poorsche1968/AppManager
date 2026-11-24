import {showLocalApp} from './app-frame.js';
import {readBrandingFile} from './branding.js';
import {readBranding, readWorkspace, writeBranding, writeWorkspace, cleanPath} from './storage.js';
import {applyTheme, colorFields, currentColors, defaultSettings, presets, setThemeColor, themeMode} from './theme.js';

const $ = selector => document.querySelector(selector);
const main = $('#main');
const dialog = $('#dialog');
const form = $('#dialog-form');
const input = $('#search');
const shell = $('.shell');
const tabIcon = $('#tab-icon');
const defaultTabIcon = tabIcon.href;
const modeQuery = matchMedia('(prefers-color-scheme: dark)');
const pages = {home:'Übersicht', apps:'Apps', links:'Webseiten', folders:'Ordner', settings:'Einstellungen'};
const symbols = {
  home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  app:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18m-12 4-2 2 2 2m6-4 2 2-2 2"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7m2.2 5.8a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>',
  folderPlus:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2zM12 10v6m-3-3h6"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.3a2 2 0 1 1-4 0V21A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1h-.3a2 2 0 1 1 0-4H3A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0V3A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.3a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  close:'<path d="m18 6-12 12M6 6l12 12"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5m-4.5-3a8 8 0 0 1 13-3L20 9m-16 6 2.5 3a8 8 0 0 0 13-3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon:'<path d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3z"/>',
  monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-4 0h8"/>',
  upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4"/>',
  download:'<path d="M12 4v12m-4-4 4 4 4-4M4 16v4h16v-4"/>'
};
const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + symbols[name] + '</svg>';
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const attr = html;
const button = (label, action, symbol, extra = '', cls = '') =>
  '<button type="button" class="button ' + cls + '" data-action="' + action + '" ' + extra + '>' + (symbol ? icon(symbol) : '') + html(label) + '</button>';
const iconButton = (label, action, symbol, extra = '') =>
  '<button type="button" class="icon-button" data-action="' + action + '" title="' + attr(label) + '" aria-label="' + attr(label) + '" ' + extra + '>' + icon(symbol) + '</button>';
const option = (value, label, active) => '<option value="' + attr(value) + '"' + (active ? ' selected' : '') + '>' + html(label) + '</option>';
const defaults = () => ({items:[], settings:defaultSettings()});
const byName = (a,b) => a.name.localeCompare(b.name,'de',{numeric:true});
const kindLabels = {app:'App', link:'Webseite', folder:'Ordner'};
let state = defaults();
let branding = null;
let view = {page:'home'};
let dialogSubmit;
let toastTimer;
let viewerRequest;
let saveQueue = Promise.resolve();

const find = id => state.items.find(item => item.id === id);
const folders = () => state.items.filter(item => item.type === 'folder').sort(byName);
function ancestry(id) {
  const branch = [];
  for (let cursor = find(id); cursor && !branch.includes(cursor); cursor = find(cursor.parent)) branch.unshift(cursor);
  return branch;
}
const locationName = id => ancestry(id).map(item => item.name).join(' / ') || 'Hauptordner';
const navSymbol = {home:'home', apps:'app', links:'link', folders:'folder', settings:'settings'};
function nav(label, page, id = '') {
  const active = view.page === page && (view.id ?? '') === id;
  return '<button class="nav-button' + (active ? ' active' : '') + '" data-action="go" data-page="' + page +
    '" data-id="' + attr(id) + '" aria-label="' + attr(label) + '" title="' + attr(label) + '"' +
    (active ? ' aria-current="page"' : '') + '>' + icon(navSymbol[page] || 'folder') + '<span>' + html(label) + '</span></button>';
}
function renderChrome() {
  applyTheme(state.settings);
  shell.classList.toggle('collapsed',state.settings.collapsed);
  const toggle = $('.sidebar-toggle');
  toggle.innerHTML = icon('panel');
  const toggleText = state.settings.collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen';
  toggle.title = toggleText;
  toggle.setAttribute('aria-label',toggleText);
  toggle.setAttribute('aria-expanded',String(!state.settings.collapsed));
  const roots = folders().filter(item => !item.parent);
  $('#navigation').innerHTML = '<div class="nav-group"><div class="nav-label">Arbeitsbereich</div>' +
    ['home','apps','links','folders'].map(page => nav(pages[page],page)).join('') + '</div>' +
    (roots.length ? '<div class="nav-group folder-nav"><div class="nav-label">Meine Ordner</div>' +
      roots.map(item => nav(item.name,'folder',item.id)).join('') + '</div>' : '');
  $('#sidebar-bottom').innerHTML = nav('Einstellungen','settings');
  const step = (label, page, id = '') => '<button class="crumb" data-action="go" data-page="' + page + '" data-id="' +
    attr(id) + '">' + html(label) + '</button>' + icon('chevron');
  const current = find(view.id);
  const branch = current ? ancestry(current.parent) : [];
  $('#breadcrumbs').innerHTML = (view.page === 'home' ? '' : step('Übersicht','home')) +
    branch.map(item => step(item.name,'folder',item.id)).join('') +
    '<strong aria-current="page">' + html(current?.name ?? pages[view.page]) + '</strong>';
  $('#search-wrap').hidden = ['settings','viewer'].includes(view.page);
  $('#add').hidden = ['settings','viewer'].includes(view.page);
  const viewerTools = $('#viewer-tools');
  if (viewerTools) {
    viewerTools.hidden = view.page !== 'viewer';
    viewerTools.innerHTML = view.page === 'viewer' ?
      iconButton('App neu laden','reload','refresh') +
      iconButton('App schließen','go','close','data-page="apps"') : '';
  }
  $('#add').innerHTML = icon('plus') + 'Hinzufügen';
}
function quick(label, description, symbol, action) {
  return '<button class="quick" type="button" data-action="' + action + '"><span class="tile-icon">' + icon(symbol) +
    '</span><span class="quick-text"><strong>' + html(label) + '</strong>' +
    (description ? '<span class="subtle">' + html(description) + '</span>' : '') + '</span></button>';
}
function list(items, empty, showPath = false) {
  if (!items.length) return '<div class="empty">' + icon('folder') + '<span>' + html(empty) + '</span></div>';
  return '<div class="grid">' + [...items].sort((a,b) => (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1) || byName(a,b)).map(item => {
    const note = showPath ? locationName(item.parent) : item.type === 'link' ? new URL(item.url).hostname :
      item.type === 'folder' ? state.items.filter(child => child.parent === item.id).length + ' Einträge' : item.entry;
    const body = '<span class="tile-icon">' + icon(item.type) + '</span><span class="entry-text"><strong>' + html(item.name) +
      '</strong><span class="subtle">' + html(note) + '</span></span>';
    const edit = iconButton(item.name + ' bearbeiten','edit','dots','data-id="' + attr(item.id) + '"');
    const open = item.type === 'link' ? '<a class="entry" href="' + attr(item.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + attr(item.name + ' in neuem Tab öffnen') + '">' + body + '</a>' :
      '<button class="entry" data-action="open" data-id="' + attr(item.id) + '">' + body + '</button>';
    return '<article class="item">' + open + edit + '</article>';
  }).join('') + '</div>';
}
function renderMain() {
  viewerRequest?.abort();
  viewerRequest = null;
  const query = input.value.trim().toLocaleLowerCase('de');
  if (query && !['settings','viewer'].includes(view.page)) {
    const matches = state.items.filter(item => [item.name,item.url,item.entry,locationName(item.parent)].some(value =>
      value?.toLocaleLowerCase('de').includes(query)));
    main.innerHTML = '<div class="content"><h1 class="page-title">Suchergebnisse</h1><div class="section">' +
      list(matches,'Keine passenden Einträge gefunden.',true) + '</div></div>';
    return;
  }
  if (view.page === 'settings') { renderSettings(); return; }
  if (view.page === 'viewer') { void renderViewer(find(view.id)); return; }
  if (view.page === 'home') {
    const roots = state.items.filter(item => !item.parent);
    main.innerHTML = '<div class="content"><section>' +
      '<div class="section-head"><h2>Schnell hinzufügen</h2></div><div class="grid quick-grid">' +
      quick('HTML-Datei','Einzelne App importieren','app','import-html') +
      quick('App-Ordner','Mit CSS, Bildern und mehr','folderPlus','import-folder') +
      quick('Webseite','Link zum Öffnen speichern','link','new-link') + '</div></section>' +
      '<section class="section"><div class="section-head"><h2>Meine Sammlung</h2><span class="count">' +
      state.items.length + (state.items.length === 1 ? ' Eintrag' : ' Einträge') +
      '</span></div>' + list(roots,'Hier erscheinen deine Apps, Webseiten und Ordner.') + '</section></div>';
    return;
  }
  const current = find(view.id);
  const items = view.page === 'folder' ? state.items.filter(item => item.parent === view.id) :
    view.page === 'folders' ? folders().filter(item => !item.parent) :
      state.items.filter(item => item.type === (view.page === 'apps' ? 'app' : 'link'));
  main.innerHTML = '<div class="content"><div class="section-head"><h1 class="page-title">' +
    html(current?.name ?? pages[view.page]) + '</h1>' +
    (view.page === 'folders' || view.page === 'folder' ? button('Neuer Ordner','new-folder','folderPlus') : '') +
    '</div><div class="section">' + list(items,'Hier sind noch keine Einträge.', ['apps','links'].includes(view.page)) + '</div></div>';
}
function render() { renderChrome(); renderMain(); }
function go(page,id) {
  view = id ? {page,id} : {page};
  input.value = '';
  if (matchMedia('(max-width: 480px)').matches && !state.settings.collapsed) {
    updateSettings(settings => { settings.collapsed = true; });
  }
  main.scrollTop = 0;
  render();
}
function showToast(message) {
  $('#toast').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; },5000);
}
function displayError(error) { showToast(error?.message || 'Der Vorgang ist fehlgeschlagen.'); }
function save(mutator, assets) {
  const pending = saveQueue.then(async () => {
    const latest = (await readWorkspace()).state ?? state;
    const updated = structuredClone(latest);
    mutator(updated);
    await writeWorkspace(updated, assets);
    state = updated;
    renderChrome();
  });
  saveQueue = pending.catch(() => {});
  return pending;
}
function updateSettings(change, refresh = false) {
  void save(draft => change(draft.settings)).then(() => {
    if (refresh && view.page === 'settings') renderMain();
  }).catch(displayError);
}

function renderBranding() {
  const logo = $('.brand img');
  if (branding) logo.src = branding.logo;
  else logo.removeAttribute('src');
  logo.alt = branding?.name ?? '';
  logo.parentElement.hidden = !branding;
  tabIcon.href = branding?.tab ?? defaultTabIcon;
}

async function updateBranding(value) {
  await writeBranding(value);
  branding = value;
  renderBranding();
  if (view.page === 'settings') renderMain();
  showToast(branding ? 'Logos importiert.' : 'Neutrale Darstellung aktiviert.');
}

function renderSettings() {
  const settings = state.settings;
  const colors = currentColors(settings);
  const modes = [['light','Hell','sun'],['dark','Dunkel','moon'],['system','System','monitor']];
  main.innerHTML = '<div class="content"><h1 class="page-title">Einstellungen</h1><div class="settings">' +
    '<section><h2>Darstellung</h2><div class="row">' + modes.map(([id,label,symbol]) =>
      button(label,'mode',symbol,'data-mode="' + id + '" aria-pressed="' + (settings.mode === id) + '"',settings.mode === id ? 'mode-active' : '')).join('') +
    '</div></section><section><h2>Farbvorlagen</h2><div class="swatches">' + Object.entries(presets).map(([id,preset]) =>
      '<button class="button preset' + (settings.preset === id ? ' mode-active' : '') + '" data-action="preset" data-preset="' + id +
      '" aria-pressed="' + (settings.preset === id) + '"><span class="swatch" style="--sample:' + preset[themeMode(settings)].button + '"></span>' +
      html(preset.name) + '</button>').join('') +
    '</div></section><section><h2>Eigene Farben</h2><p class="subtle">Du bearbeitest den ' +
    (themeMode(settings) === 'dark' ? 'Dunkelmodus.' : 'Hellmodus.') +
    ' Beide Modi speichern ihre Farben getrennt.</p><div class="colors">' + Object.entries(colorFields).map(([key,label]) =>
      '<label class="color-field"><input type="color" data-color="' + key + '" value="' + colors[key] + '">' + html(label) + '</label>').join('') +
    '</div>' + button('Farben dieses Modus zurücksetzen','reset-colors') +
    '</section><section><h2>Logos</h2><p class="subtle">' +
    (branding ? 'Importierte Logos sind in diesem Browser aktiv.' : 'Neutrale Darstellung aktiv.') +
    '</p><div class="row">' + button('Logos importieren','import-branding','upload') +
    (branding ? button('Logos entfernen','clear-branding',null) : '') +
    '</div></section><section><h2>Backup</h2><p class="subtle">Sichere Einträge, App-Dateien und Einstellungen oder übertrage sie in einen anderen Browser.</p>' +
    '<div class="row">' + button('Backup exportieren','export','download') + button('Backup importieren','backup','upload') +
    '</div></section></div></div>';
}

function dialogContent(title, inner, submit, label = 'Speichern', removeId = '') {
  dialogSubmit = submit;
  form.innerHTML = '<div class="dialog-title"><h2 id="dialog-title">' + html(title) + '</h2>' +
    iconButton('Schließen','close','close') + '</div>' + inner + '<div class="error" role="alert" hidden></div>' +
    (submit ? '<div class="dialog-actions">' + (removeId ? button('Löschen','delete',null,'data-id="' + attr(removeId) + '"') : '') +
      button('Abbrechen','close') + '<button class="button primary" type="submit">' + html(label) + '</button></div>' : '');
  dialog.setAttribute('aria-labelledby','dialog-title');
  if (!dialog.open) dialog.showModal();
  else form.querySelector('input, button')?.focus();
}
const field = (name,label,value = '') => '<label class="field">' + html(label) + '<input name="' + name + '" value="' +
  attr(value) + '" required maxlength="' + (name === 'url' ? 4000 : 120) + '"></label>';
function folderField(parent, exclude = '') {
  const choices = folders().filter(item => !exclude || !ancestry(item.id).some(part => part.id === exclude)).sort((a,b) =>
    locationName(a.id).localeCompare(locationName(b.id),'de'));
  return '<label class="field">Ablage<select name="parent">' + option('','Hauptordner',!parent) +
    choices.map(item => option(item.id,locationName(item.id),item.id === parent)).join('') + '</select></label>';
}
const parentHere = () => view.page === 'folder' ? view.id : '';
function linkURL(text) {
  const value = text.trim();
  if (!value) throw new Error('Gib eine Webadresse ein.');
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : 'https://' + value;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('Gib eine gültige Webadresse ein.'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Verwende eine HTTP- oder HTTPS-Adresse ohne Anmeldedaten.');
  }
  return url.href;
}
function addDialog() {
  dialogContent('Eintrag hinzufügen','<div class="dialog-options">' +
    quick('HTML-Datei','Eine einzelne HTML-App','app','import-html') +
    quick('App-Ordner','App mit ihren Dateien','folder','import-folder') +
    quick('Webseite','Eine Webadresse speichern','link','new-link') +
    quick('Ordner','Apps und Webseiten sortieren','folderPlus','new-folder') + '</div>');
}
function editDialog(type, existing, imported) {
  const parent = existing?.parent ?? parentHere();
  const entries = existing?.entries ?? imported?.entries ?? [];
  const title = existing ? kindLabels[type] + ' bearbeiten' :
    type === 'app' ? 'App importieren' : type === 'folder' ? 'Ordner anlegen' : 'Webseite hinzufügen';
  const details = type === 'link' ? field('url','Webadresse',existing?.url) :
    type === 'app' ? '<label class="field">Startdatei<select name="entry">' +
      entries.map(entry => option(entry,entry,entry === (existing?.entry ?? imported?.entry))).join('') +
      '</select></label>' + (imported ? '<p class="subtle">Importiere nur eigene oder vertrauenswürdige Apps. Ihr JavaScript läuft mit Zugriff auf den gemeinsamen Browser-Speicher des Dashboards.</p>' : '') : '';
  dialogContent(title,field('name','Name',existing?.name ?? imported?.name) + details +
    folderField(parent,type === 'folder' ? existing?.id : ''),async data => {
    const name = data.get('name').trim();
    if (!name) throw new Error('Gib einen Namen ein.');
    const item = {id:existing?.id ?? crypto.randomUUID(),type,name,parent:data.get('parent')};
    if (type === 'link') item.url = linkURL(data.get('url'));
    if (type === 'app') { item.entries = entries; item.entry = data.get('entry'); }
    const files = imported?.files.map(file => ({app:item.id,...file}));
    await save(draft => {
      if (item.parent && !draft.items.some(folder => folder.id === item.parent && folder.type === 'folder')) {
        throw new Error('Dieser Zielordner ist nicht mehr vorhanden.');
      }
      if (existing) {
        if (!draft.items.some(entry => entry.id === item.id)) throw new Error('Dieser Eintrag ist nicht mehr vorhanden.');
        let cursor = item.parent;
        while (cursor) {
          if (cursor === item.id) throw new Error('Ein Ordner kann nicht in sich selbst verschoben werden.');
          cursor = draft.items.find(entry => entry.id === cursor)?.parent;
        }
        draft.items = draft.items.map(entry => entry.id === item.id ? item : entry);
      } else draft.items.push(item);
    },{files});
    showToast(existing ? 'Änderungen gespeichert.' : kindLabels[type] + (type === 'app' ? ' importiert.' : ' hinzugefügt.'));
  },imported ? 'App speichern' : 'Speichern',existing?.id);
}
function chooseFile(id) {
  if (dialog.open) dialog.close();
  const picker = $(id);
  picker.value = '';
  picker.click();
}
function readImport(files, folder) {
  if (!files.length) return;
  const imported = files.map(file => ({
    path:folder ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name,
    blob:file
  }));
  if (!imported.every(file => cleanPath(file.path))) throw new Error('Im ausgewählten Ordner gibt es einen ungültigen Dateipfad.');
  const entries = imported.map(file => file.path).filter(path => /\.html?$/i.test(path))
    .sort((a,b) => a.split('/').length - b.split('/').length || a.localeCompare(b,'de'));
  if (!entries.length) throw new Error('Der Ordner enthält keine HTML-Datei.');
  const entry = entries.find(path => /^index\.html?$/i.test(path)) ?? entries[0];
  const name = folder ? files[0].webkitRelativePath.split('/')[0] : files[0].name.replace(/\.html?$/i,'');
  editDialog('app',null,{files:imported,entries,entry,name});
}
function removeDialog(item) {
  const descendants = state.items.filter(entry => entry.id !== item.id && ancestry(entry.parent).includes(item));
  const message = descendants.length ? 'Der Ordner „' + item.name + '“ und ' + descendants.length + ' enthaltene Einträge werden gelöscht.' :
    '„' + item.name + '“ wird aus dem Dashboard gelöscht.';
  dialogContent('Eintrag löschen','<p>' + html(message) + '</p>',async () => {
    const ids = new Set([item.id]);
    await save(draft => {
      let size;
      do {
        size = ids.size;
        for (const entry of draft.items) if (ids.has(entry.parent)) ids.add(entry.id);
      } while (ids.size !== size);
      draft.items = draft.items.filter(entry => !ids.has(entry.id));
    },{remove:[item.id,...descendants.map(entry => entry.id)]});
    if (ids.has(view.id)) go('home');
    showToast('Eintrag gelöscht.');
  },'Löschen');
}

async function renderViewer(item) {
  if (!item) { go('apps'); return; }
  main.innerHTML = '<div class="viewer"><div class="viewer-message">App wird geladen …</div></div>';
  const box = main.firstElementChild;
  const message = box.firstElementChild;
  viewerRequest = new AbortController();
  const {signal} = viewerRequest;
  const frame = document.createElement('iframe');
  frame.title = item.name;
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups');
  try {
    const controller = navigator.serviceWorker?.controller;
    let source;
    if (controller?.scriptURL === new URL('./sw.js',location.href).href) {
      // An older service worker can still control the dashboard without serving its app files.
      const url = './__werkraum_apps__/' + encodeURIComponent(item.id) + '/' + item.entry.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(url,{method:'HEAD',cache:'no-store',signal}).catch(() => null);
      signal.throwIfAborted();
      if (response?.ok && response.headers.get('content-type')?.startsWith('text/html')) source = url;
    }
    if (source) {
      frame.src = source;
    } else {
      await showLocalApp(frame,item.id,item.entry,signal,error => {
        if (!signal.aborted) displayError(error);
      });
    }
    if (!signal.aborted) message.replaceWith(frame);
  } catch (error) {
    if (!signal.aborted) message.textContent = error?.message || 'Die gespeicherte App konnte nicht geöffnet werden.';
  }
}

function toBase64(blob) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',')+1));
    reader.readAsDataURL(blob);
  });
}
async function exportBackup() {
  await saveQueue;
  const snapshot = await readWorkspace(true);
  const files = [];
  for (const {app,path,blob} of snapshot.files) files.push({app,path,mime:blob.type,data:await toBase64(blob)});
  const url = URL.createObjectURL(new Blob([JSON.stringify({format:'werkraum',version:1,state:snapshot.state ?? state,files})],
    {type:'application/json'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Werkraum-Backup.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url),30000);
  showToast('Backup erstellt.');
}
function validateBackup(backup) {
  const remote = backup?.state;
  if (backup?.format !== 'werkraum' || backup.version !== 1 || !Array.isArray(remote?.items) || !Array.isArray(backup.files)) {
    throw new Error('Das ist kein gültiges Werkraum-Backup.');
  }
  const settings = remote.settings;
  if (!['light','dark','system'].includes(settings?.mode) || !Object.hasOwn(presets,settings.preset) ||
      typeof settings.collapsed !== 'boolean') throw new Error('Die Darstellungseinstellungen im Backup sind ungültig.');
  const cleaned = {mode:settings.mode,preset:settings.preset,collapsed:settings.collapsed,colors:{light:{},dark:{}}};
  for (const mode of ['light','dark']) {
    for (const [key,value] of Object.entries(settings.colors?.[mode] ?? {})) {
      if (Object.hasOwn(colorFields,key) && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) cleaned.colors[mode][key] = value;
    }
  }
  const entries = new Map();
  for (const item of remote.items) {
    if (!item || typeof item.id !== 'string' || !/^[\w-]{1,100}$/.test(item.id) || entries.has(item.id) ||
        !Object.hasOwn(kindLabels,item.type) || typeof item.name !== 'string' || !item.name.trim() || typeof item.parent !== 'string') {
      throw new Error('Stelle nur eigene oder vertrauenswürdige Backups wieder her. Das Backup enthält ungültige Einträge.');
    }
    if (item.type === 'link') item.url = linkURL(item.url);
    if (item.type === 'app' && (!Array.isArray(item.entries) || !item.entries.includes(item.entry) ||
        !item.entries.every(entry => cleanPath(entry) && /\.html?$/i.test(entry)))) throw new Error('Eine App-Startdatei im Backup ist ungültig.');
    entries.set(item.id,item);
  }
  for (const item of entries.values()) {
    const seen = new Set([item.id]);
    for (let id = item.parent; id;) {
      const parent = entries.get(id);
      if (parent?.type !== 'folder' || seen.has(id)) throw new Error('Die Ordnerstruktur im Backup ist ungültig.');
      seen.add(id);
      id = parent.parent;
    }
  }
  const paths = new Map();
  const files = backup.files.map(file => {
    if (entries.get(file?.app)?.type !== 'app' || !cleanPath(file.path) || typeof file.data !== 'string') {
      throw new Error('Eine App-Datei im Backup ist ungültig.');
    }
    if (!paths.has(file.app)) paths.set(file.app,new Set());
    const appPaths = paths.get(file.app);
    if (appPaths.has(file.path)) throw new Error('Stelle nur eigene oder vertrauenswürdige Backups wieder her. Das Backup enthält doppelte App-Dateien.');
    appPaths.add(file.path);
    const bytes = Uint8Array.from(atob(file.data),c => c.charCodeAt(0));
    return {app:file.app,path:file.path,blob:new Blob([bytes],{type:typeof file.mime === 'string' ? file.mime : ''})};
  });
  for (const item of entries.values()) {
    if (item.type === 'app' && !item.entries.every(entry => paths.get(item.id)?.has(entry))) {
      throw new Error('Im Backup fehlen App-Dateien.');
    }
  }
  return {restored:{items:[...entries.values()],settings:cleaned},files};
}

const actions = {
  collapse:() => updateSettings(settings => { settings.collapsed = !settings.collapsed; }),
  go:node => go(node.dataset.page,node.dataset.id),
  add:addDialog,
  'new-link':() => editDialog('link'),
  'new-folder':() => editDialog('folder'),
  'import-html':() => chooseFile('#pick-html'),
  'import-folder':() => chooseFile('#pick-folder'),
  'import-branding':() => chooseFile('#pick-branding'),
  'clear-branding':() => updateBranding(null),
  backup:() => chooseFile('#pick-backup'),
  export:exportBackup,
  close:() => dialog.close(),
  open:node => {
    const item = find(node.dataset.id);
    if (item) go(item.type === 'folder' ? 'folder' : 'viewer',item.id);
  },
  edit:node => {
    const item = find(node.dataset.id);
    if (item) editDialog(item.type,item);
  },
  delete:node => {
    const item = find(node.dataset.id);
    if (item) removeDialog(item);
  },
  mode:node => updateSettings(settings => { settings.mode = node.dataset.mode; },true),
  preset:node => updateSettings(settings => {
    settings.preset = node.dataset.preset;
    settings.colors[themeMode(settings)] = {};
  },true),
  'reset-colors':() => updateSettings(settings => { settings.colors[themeMode(settings)] = {}; },true),
  reload:() => { if (view.page === 'viewer') renderMain(); }
};
document.addEventListener('click', event => {
  const node = event.target.closest('[data-action]');
  if (!node) return;
  try { Promise.resolve(actions[node.dataset.action]?.(node)).catch(displayError); }
  catch (error) { displayError(error); }
});
document.addEventListener('keydown',event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !$('#search-wrap').hidden && !dialog.open) {
    event.preventDefault();
    input.focus();
  }
});
input.addEventListener('input',renderMain);
form.addEventListener('submit',async event => {
  event.preventDefault();
  if (!dialogSubmit) return;
  const submit = form.querySelector('[type=submit]');
  const error = form.querySelector('.error');
  submit.disabled = true;
  error.hidden = true;
  try {
    await dialogSubmit(new FormData(form));
    dialog.close();
    if (view.page !== 'viewer') renderMain();
  } catch (problem) {
    error.textContent = problem?.name === 'QuotaExceededError' ? 'Der Browser-Speicher ist voll.' :
      problem?.message || 'Der Eintrag konnte nicht gespeichert werden.';
    error.hidden = false;
  } finally { submit.disabled = false; }
});
document.addEventListener('input',event => {
  const key = event.target.dataset.color;
  if (!key) return;
  setThemeColor(key,event.target.value);
});
document.addEventListener('change',event => {
  const key = event.target.dataset.color;
  if (key) updateSettings(settings => { settings.colors[themeMode(settings)][key] = event.target.value; });
});
modeQuery.addEventListener('change',() => {
  if (state.settings.mode !== 'system') return;
  renderChrome();
  if (view.page === 'settings') renderMain();
});
for (const [selector,folder] of [['#pick-html',false],['#pick-folder',true]]) {
  $(selector).addEventListener('change',event => {
    try { readImport([...event.target.files],folder); } catch (error) { displayError(error); }
  });
}
$('#pick-backup').addEventListener('change',async event => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const {restored,files} = validateBackup(JSON.parse(await file.text()));
    dialogContent('Backup wiederherstellen','<p>Stelle nur eigene oder vertrauenswürdige Backups wieder her. Das Backup enthält ' + restored.items.length +
      ' Einträge. Beim Wiederherstellen werden deine aktuellen Einträge und Einstellungen ersetzt.</p>', async () => {
      await save(draft => Object.assign(draft,restored),{files,replace:true});
      go('settings');
      showToast('Backup wiederhergestellt.');
    },'Wiederherstellen');
  } catch (error) { displayError(error instanceof SyntaxError ? new Error('Das Backup konnte nicht gelesen werden.') : error); }
});
$('#pick-branding').addEventListener('change',async event => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  try { await updateBranding(await readBrandingFile(file)); }
  catch (error) { displayError(error); }
});
try {
  state = (await readWorkspace()).state ?? state;
  branding = await readBranding();
}
catch (error) { displayError(error); }
renderBranding();
render();
