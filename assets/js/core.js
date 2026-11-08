/* Socle de la démo : langue, utilitaires, routeur, thème, algorithmes publics.
   Tout le code de ce dépôt a été écrit pour la démo : il ne reprend aucun
   fichier des applications livrées à l'entreprise. */
'use strict';

/* Langue : paramètre ?lang= de l'URL, sinon choix mémorisé, sinon langue du
   navigateur. Changer de langue recharge la page, ce qui régénère les données
   fictives dans la nouvelle langue. */
const LANG = (() => {
  const param = new URLSearchParams(location.search).get('lang');
  if (param === 'fr' || param === 'en') return param;
  try {
    const saved = localStorage.getItem('demo-lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch (e) { /* stockage indisponible */ }
  return (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
})();
const L = (fr, en) => (LANG === 'en' ? en : fr);
const LOCALE = L('fr-FR', 'en-GB');
document.documentElement.lang = LANG;

const App = { pages: {}, current: null, shared: {} };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, w = 2) => String(n).padStart(w, '0');
const hex = (n, w = 2) => Number(n).toString(16).toUpperCase().padStart(w, '0');
const hexBytes = (b) => Array.from(b, (x) => hex(x)).join(' ');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nf = (n, d = 0) => Number(n).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });

/* CSV ouvrable dans Excel : point-virgule en français, virgule en anglais. */
function csv(rows) {
  const sep = L(';', ',');
  const cell = (v) => {
    const s = String(v ?? '');
    return /[";,\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `﻿${rows.map((r) => r.map(cell).join(sep)).join('\n')}`;
}

/* Générateur pseudo-aléatoire déterministe : les jeux de données fictifs sont
   identiques à chaque visite. */
function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (min, max) => min + Math.floor(next() * (max - min + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

/* Contrôles d'intégrité : uniquement des algorithmes publics et documentés. */
const Checksums = {
  'CRC-16/CCITT-FALSE': (data) => {
    let c = 0xffff;
    for (const b of data) {
      c ^= b << 8;
      for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
    }
    return { value: c, size: 2 };
  },
  'CRC-16/MODBUS': (data) => {
    let c = 0xffff;
    for (const b of data) {
      c ^= b;
      for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1;
    }
    return { value: c, size: 2 };
  },
  [L('Somme 8 bits', '8-bit sum')]: (data) => ({ value: data.reduce((s, b) => (s + b) & 0xff, 0), size: 1 }),
  [L('XOR 8 bits', '8-bit XOR')]: (data) => ({ value: data.reduce((s, b) => s ^ b, 0), size: 1 }),
};

function toast(message, kind = 'info') {
  let box = $('#toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('aria-live', 'polite');
    document.body.append(box);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.textContent = message;
  box.append(t);
  setTimeout(() => t.remove(), 4800);
}

function download(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const simBanner = (text) => `<p class="sim-banner"><strong>Simulation.</strong> ${text}</p>`;

function tabsHtml(tabs, active) {
  return `<div class="tabs" role="tablist">${tabs
    .map((t) => `<button role="tab" aria-selected="${t.id === active}" class="tab ${t.id === active ? 'on' : ''}" data-tab="${t.id}">${esc(t.label)}</button>`)
    .join('')}</div>`;
}

/* Infobulle partagée par les graphiques. */
const Tip = {
  el: null,
  show(html, x, y) {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'chart-tip';
      document.body.append(this.el);
    }
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    const r = this.el.getBoundingClientRect();
    this.el.style.left = `${clamp(x + 14, 8, innerWidth - r.width - 8)}px`;
    this.el.style.top = `${clamp(y - r.height - 10, 8, innerHeight - r.height - 8)}px`;
  },
  hide() { if (this.el) this.el.style.display = 'none'; },
};

/* Routeur et navigation */
const SITE = L('Démo de stage', 'Internship demo');
const NAV = [
  { id: 'home', label: L('Vue d’ensemble', 'Overview'), group: '' },
  { id: 'foxsoft', label: 'FOX_Soft', tag: L('Projet principal', 'Main project'), group: L('Démos interactives', 'Interactive demos') },
  { id: 'binviz', label: 'FoxBinVisualizer', tag: L('Format binaire', 'Binary format'), group: L('Démos interactives', 'Interactive demos') },
  { id: 'frames', label: 'FoxFrameGenerator', tag: L('Trames série', 'Serial frames'), group: L('Démos interactives', 'Interactive demos') },
  { id: 'alarms', label: L('Analyseur d’alarmes', 'Alarm log analyser'), tag: L('Journaux', 'Logs'), group: L('Démos interactives', 'Interactive demos') },
  { id: 'fleet', label: 'PhoenixConfigAnalizer', tag: L('Flotte', 'Fleet'), group: L('Démos interactives', 'Interactive demos') },
  { id: 'firedeck', label: 'FireDeck', tag: L('Devis sur plan', 'Quotes on plans'), group: L('Démos interactives', 'Interactive demos') },
  { id: 'method', label: L('Méthode & bilan', 'Method & results'), group: L('Le stage', 'The internship') },
  { id: 'scope', label: L('Ce qui est masqué', 'What is hidden'), group: L('Le stage', 'The internship') },
];

function renderNav(active) {
  let html = '';
  let group = null;
  for (const n of NAV) {
    if (n.group !== group) {
      group = n.group;
      if (group) html += `<div class="nav-group">${esc(group)}</div>`;
    }
    html += `<a class="nav-link ${n.id === active ? 'on' : ''}" href="#/${n.id}" ${n.id === active ? 'aria-current="page"' : ''}>
      <span>${esc(n.label)}</span>${n.tag ? `<small>${esc(n.tag)}</small>` : ''}</a>`;
  }
  $('#nav').innerHTML = html;
}

function route() {
  const id = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
  const key = App.pages[id] ? id : 'home';
  if (App.current && App.current.unmount) App.current.unmount();
  Tip.hide();
  const main = $('#main');
  const page = App.pages[key];
  main.innerHTML = '';
  page.mount(main);
  App.current = page;
  document.title = `${page.title} · ${SITE}`;
  renderNav(key);
  document.body.classList.remove('nav-open');
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('demo-theme'); } catch (e) { /* stockage indisponible */ }
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const sync = () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    $('#theme').textContent = isDark ? L('Thème clair', 'Light theme') : L('Thème sombre', 'Dark theme');
  };
  sync();
  $('#theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('demo-theme', next); } catch (e) { /* idem */ }
    sync();
    window.dispatchEvent(new Event('themechange'));
  });
}

function initLang() {
  $('#brand-title').textContent = SITE;
  $('#skip').textContent = L('Aller au contenu', 'Skip to content');
  $('#burger').textContent = L('Menu', 'Menu');
  $('#burger').setAttribute('aria-label', L('Ouvrir le menu', 'Open the menu'));
  $('#nav').setAttribute('aria-label', L('Sections de la démo', 'Demo sections'));
  const b = $('#lang');
  b.textContent = L('English', 'Français');
  b.setAttribute('lang', L('en', 'fr'));
  b.setAttribute('aria-label', L('Afficher la démo en anglais', 'Show the demo in French'));
  b.addEventListener('click', () => {
    const next = L('en', 'fr');
    try { localStorage.setItem('demo-lang', next); } catch (e) { /* idem */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    location.href = url.toString();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  initLang();
  initTheme();
  $('#burger').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  window.addEventListener('hashchange', route);
  route();
});
