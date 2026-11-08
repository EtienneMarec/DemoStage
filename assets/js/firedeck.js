/* FireDeck, version simulée : placement d'équipements sur le plan d'un navire
   imaginaire et nomenclature. Le plan est dessiné ici, sans import de fichier DWG. */
'use strict';

(() => {
  const VIEW = { w: 1200, h: 440 };
  const LOOP_WORD = L('Boucle', 'Loop');
  const LOOPS = { A: { label: `${LOOP_WORD} A`, color: 'var(--series-2)' }, B: { label: `${LOOP_WORD} B`, color: 'var(--series-1)' } };
  const SYMBOLS = {
    OPT: { label: L('Détecteur optique', 'Optical detector'), glyph: (c) => `<circle r="5" fill="${c}"/>` },
    HEAT: { label: L('Détecteur thermique', 'Heat detector'), glyph: (c) => `<path d="M0-8c1 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-5 1 1 1 2 2 2 1-2 0-4 1-6z" fill="${c}"/>` },
    MULTI: { label: L('Multi-capteur', 'Multi-sensor'), glyph: (c) => `<circle cy="-3" r="3.4" fill="${c}"/><path d="M0 1 5 8H-5z" fill="${c}"/>` },
    MCP: { label: L('Déclencheur manuel', 'Manual call point'), square: true, glyph: (c) => `<text y="5" text-anchor="middle" font-size="15" font-weight="700" fill="${c}">F</text>` },
    SND: { label: L('Sirène', 'Sounder'), glyph: (c) => `<path d="M-6-3h3l6-5V8L-3 3h-3z" fill="${c}"/>` },
    BCN: { label: L('Sirène-flash', 'Sounder-beacon'), glyph: (c) => `<path d="M1-9-5 1h4l-2 8 7-11H0z" fill="${c}"/>` },
    PANEL: { label: L('Centrale', 'Control panel'), square: true, glyph: (c) => `<rect x="-6" y="-5" width="12" height="10" rx="1.5" fill="none" stroke="${c}" stroke-width="2"/><path d="M-3 0h6" stroke="${c}" stroke-width="2"/>` },
  };
  const DECKS = [
    {
      id: 'main', name: L('Pont principal', 'Main deck'),
      hull: 'M70 80H880Q1070 96 1150 220Q1070 344 880 360H70Q48 360 48 338V102Q48 80 70 80Z',
      rooms: [[80, 104, 170, 232, L('Salle des machines', 'Engine room')], [264, 104, 140, 110, L('Atelier', 'Workshop')], [264, 226, 140, 110, L('Local groupe', 'Generator room')], [418, 104, 180, 100, L('Cabines bâbord', 'Port cabins')], [418, 236, 180, 100, L('Cabines tribord', 'Starboard cabins')], [612, 104, 150, 232, L('Cuisine et réfectoire', 'Galley and mess')], [776, 130, 150, 180, L('Magasin', 'Store')], [940, 170, 110, 100, L('Cale avant', 'Forward hold')]],
    },
    {
      id: 'upper', name: L('Pont supérieur', 'Upper deck'),
      hull: 'M150 96H820Q1000 110 1070 220Q1000 330 820 344H150Q128 344 128 322V118Q128 96 150 96Z',
      rooms: [[156, 120, 190, 200, L('Salon arrière', 'Aft lounge')], [360, 120, 240, 86, L('Coursive et cabines', 'Corridor and cabins')], [360, 234, 240, 86, L('Cabines passagers', 'Passenger cabins')], [614, 120, 190, 200, L('Salon avant', 'Forward lounge')], [818, 150, 150, 140, L('Local technique', 'Technical room')]],
    },
    {
      id: 'bridge', name: L('Passerelle', 'Bridge deck'),
      hull: 'M420 120H780Q880 130 920 220Q880 310 780 320H420Q398 320 398 298V142Q398 120 420 120Z',
      rooms: [[424, 146, 110, 148, L('Local radio', 'Radio room')], [548, 146, 170, 148, L('Timonerie', 'Wheelhouse')], [732, 170, 130, 100, L('Aileron', 'Bridge wing')]],
    },
  ];

  let nextId = 1;
  const seed = [
    ['main', 'PANEL', 'A', 684, 300], ['main', 'OPT', 'A', 508, 296], ['main', 'SND', 'A', 334, 296], ['main', 'HEAT', 'A', 170, 280], ['main', 'OPT', 'A', 170, 160], ['main', 'OPT', 'A', 334, 158], ['main', 'OPT', 'A', 508, 154], ['main', 'HEAT', 'A', 684, 170], ['main', 'MCP', 'A', 850, 170], ['main', 'OPT', 'A', 994, 226],
    ['upper', 'MULTI', 'B', 250, 280], ['upper', 'OPT', 'B', 250, 180], ['upper', 'OPT', 'B', 480, 170], ['upper', 'OPT', 'B', 708, 180], ['upper', 'MCP', 'B', 708, 280], ['upper', 'BCN', 'B', 480, 284],
    ['bridge', 'PANEL', 'B', 632, 190], ['bridge', 'OPT', 'B', 478, 220], ['bridge', 'SND', 'B', 632, 262],
  ];
  const sampleMarkers = () => seed.map(([deck, type, loop, x, y]) => ({ id: nextId++, deck, type, loop, x, y }));
  const state = { markers: sampleMarkers(), deck: 'main', tool: 'OPT', loop: 'A', sel: null, vb: { x: 0, y: 0, w: VIEW.w, h: VIEW.h }, undo: [] };
  let host = null;

  const snapshot = () => { state.undo.push(JSON.stringify(state.markers)); if (state.undo.length > 60) state.undo.shift(); };
  const deckMarkers = () => state.markers.filter((m) => m.deck === state.deck);

  function markerSvg(m, num, scale) {
    const c = LOOPS[m.loop].color;
    const s = SYMBOLS[m.type];
    const shape = s.square ? `<rect x="-14" y="-14" width="28" height="28" rx="3" fill="var(--surface)" stroke="${c}" stroke-width="2.4"/>` : `<circle r="14" fill="var(--surface)" stroke="${c}" stroke-width="2.4"/>`;
    return `<g class="marker ${state.sel === m.id ? 'sel' : ''}" data-id="${m.id}" transform="translate(${m.x} ${m.y}) scale(${scale})" role="img" aria-label="${esc(s.label)}, ${LOOPS[m.loop].label}, ${L('numéro', 'number')} ${num}">
      <circle class="halo" r="18" fill="transparent"/>${shape}${s.glyph(c)}<text x="16" y="-12" font-size="13" font-weight="700" fill="var(--text)">${num}</text></g>`;
  }
  function planSvg() {
    const deck = DECKS.find((d) => d.id === state.deck);
    const list = deckMarkers();
    const scale = state.vb.w / VIEW.w;
    const counters = { A: 0, B: 0 };
    const nums = new Map(list.map((m) => { counters[m.loop] += 1; return [m.id, counters[m.loop]]; }));
    const links = Object.keys(LOOPS).map((l) => {
      const pts = list.filter((m) => m.loop === l);
      return pts.length > 1 ? `<polyline points="${pts.map((m) => `${m.x},${m.y}`).join(' ')}" fill="none" stroke="${LOOPS[l].color}" stroke-width="${2 * scale}" stroke-linejoin="round"/>` : '';
    }).join('');
    const rooms = deck.rooms.map(([x, y, w, h, label]) => `<rect class="plan-room" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><text class="plan-label" x="${x + w / 2}" y="${y + 18}">${esc(label)}</text>`).join('');
    return `<svg class="plan ${state.tool ? '' : 'pan'}" id="fd-plan" viewBox="${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}" role="application" aria-label="${L('Plan : ', 'Plan: ')}${esc(deck.name)}" tabindex="0">
      <path class="plan-hull" d="${deck.hull}"/>${rooms}<line class="plan-axis" x1="20" x2="1180" y1="220" y2="220"/>
      ${links}${list.map((m) => markerSvg(m, nums.get(m.id), scale)).join('')}
    </svg>`;
  }
  function bomHtml() {
    const types = Object.keys(SYMBOLS).filter((t) => state.markers.some((m) => m.type === t));
    const count = (t, d) => state.markers.filter((m) => m.type === t && (!d || m.deck === d)).length;
    return `<table class="data"><thead><tr><th>${L('Équipement', 'Equipment')}</th>${DECKS.map((d) => `<th class="num">${esc(d.name)}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>${types.map((t) => `<tr><td>${esc(SYMBOLS[t].label)}</td>${DECKS.map((d) => `<td class="num">${count(t, d.id)}</td>`).join('')}<td class="num"><strong>${count(t)}</strong></td></tr>`).join('')}
      <tr><td><strong>Total</strong></td>${DECKS.map((d) => `<td class="num"><strong>${state.markers.filter((m) => m.deck === d.id).length}</strong></td>`).join('')}<td class="num"><strong>${state.markers.length}</strong></td></tr></tbody></table>`;
  }
  function refreshPlan() {
    const box = $('#fd-canvas', host);
    box.innerHTML = planSvg();
    bindPlan();
    $('#fd-bom', host).innerHTML = bomHtml();
  }
  function toSvg(svg, e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return { x: q.x, y: q.y };
  }
  function zoom(f, cx = state.vb.x + state.vb.w / 2, cy = state.vb.y + state.vb.h / 2) {
    const w = clamp(state.vb.w * f, VIEW.w / 6, VIEW.w);
    const k = w / state.vb.w;
    state.vb = { x: cx - (cx - state.vb.x) * k, y: cy - (cy - state.vb.y) * k, w, h: state.vb.w ? state.vb.h * k : VIEW.h };
    if (w >= VIEW.w) state.vb = { x: 0, y: 0, w: VIEW.w, h: VIEW.h };
    refreshPlan();
  }
  function removeSelected() {
    if (state.sel == null) return;
    snapshot();
    state.markers = state.markers.filter((m) => m.id !== state.sel);
    state.sel = null;
    refreshPlan();
  }
  function bindPlan() {
    const svg = $('#fd-plan', host);
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('.marker');
      if (g) {
        const m = state.markers.find((x) => x.id === Number(g.dataset.id));
        state.sel = m.id;
        svg.querySelectorAll('.marker.sel').forEach((n) => n.classList.remove('sel'));
        g.classList.add('sel');
        drag = { type: 'marker', m, g, moved: false, start: toSvg(svg, e), ox: m.x, oy: m.y };
        svg.setPointerCapture(e.pointerId);
        return;
      }
      if (!state.tool) {
        drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vb: { ...state.vb }, k: state.vb.w / svg.getBoundingClientRect().width };
        svg.setPointerCapture(e.pointerId);
        return;
      }
      const p = toSvg(svg, e);
      snapshot();
      const m = { id: nextId++, deck: state.deck, type: state.tool, loop: state.loop, x: Math.round(p.x), y: Math.round(p.y) };
      state.markers.push(m);
      state.sel = m.id;
      refreshPlan();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.type === 'marker') {
        const p = toSvg(svg, e);
        const dx = p.x - drag.start.x;
        const dy = p.y - drag.start.y;
        if (!drag.moved && Math.hypot(dx, dy) < 3) return;
        if (!drag.moved) { snapshot(); drag.moved = true; }
        drag.m.x = Math.round(drag.ox + dx);
        drag.m.y = Math.round(drag.oy + dy);
        drag.g.setAttribute('transform', `translate(${drag.m.x} ${drag.m.y}) scale(${state.vb.w / VIEW.w})`);
      } else {
        state.vb.x = drag.vb.x - (e.clientX - drag.sx) * drag.k;
        state.vb.y = drag.vb.y - (e.clientY - drag.sy) * drag.k;
        svg.setAttribute('viewBox', `${state.vb.x} ${state.vb.y} ${state.vb.w} ${state.vb.h}`);
      }
    });
    const end = () => { if (drag && drag.type === 'marker' && drag.moved) refreshPlan(); drag = null; };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const p = toSvg(svg, e);
      zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, p.x, p.y);
    }, { passive: false });
  }
  function renderTools() {
    const c = LOOPS[state.loop].color;
    $('#fd-tools', host).innerHTML = `
      <button class="tool-sym ${state.tool === null ? 'on' : ''}" data-sym="" aria-pressed="${state.tool === null}"><svg width="26" height="26" viewBox="-14 -14 28 28" aria-hidden="true"><path d="M-6-10 8 3l-6 1 3 7-3 1-3-7-5 4z" fill="var(--text)"/></svg>${L('Sélection, déplacement', 'Select and move')}</button>
      ${Object.entries(SYMBOLS).map(([k, s]) => `<button class="tool-sym ${state.tool === k ? 'on' : ''}" data-sym="${k}" aria-pressed="${state.tool === k}"><svg width="26" height="26" viewBox="-14 -14 28 28" aria-hidden="true">${s.square ? `<rect x="-12" y="-12" width="24" height="24" rx="3" fill="none" stroke="${c}" stroke-width="2"/>` : `<circle r="12" fill="none" stroke="${c}" stroke-width="2"/>`}${s.glyph(c)}</svg>${esc(s.label)}</button>`).join('')}`;
    $$('[data-sym]', host).forEach((b) => b.addEventListener('click', () => { state.tool = b.dataset.sym || null; renderTools(); refreshPlan(); }));
  }

  App.pages.firedeck = {
    title: 'FireDeck',
    mount(el) {
      host = el;
      el.innerHTML = `<header class="page-head">
        <div class="kicker">${L('Pour le service commercial', 'For the sales team')} · C#, WPF, .NET 8, MVVM</div>
        <h1>FireDeck</h1>
        <p>${L('Pour établir un devis de détection incendie, il faut relever des quantités sur les plans du navire. FireDeck importe un plan DWG en vectoriel, le découpe en ponts, y fait placer les équipements en un clic et en tire la nomenclature, ainsi que des livrables PDF et PowerPoint.', 'Quoting a fire-detection system means taking off quantities from the ship’s plans. FireDeck imports a DWG plan as vectors, splits it into decks, lets you place equipment in one click and produces the bill of materials, along with PDF and PowerPoint deliverables.')}</p>
      </header>
      ${simBanner(L('Le navire et son plan sont dessinés pour la démo, et aucun plan client n’est utilisé. Ici, l’import DWG et les exports PDF et PowerPoint sont remplacés par un export CSV et SVG.', 'The ship and its plan are drawn for this demo, and no customer plan is used. Here, the DWG import and the PDF and PowerPoint exports are replaced by CSV and SVG exports.'))}
      <div class="fd-layout">
        <aside class="card stack" style="gap:10px">
          <label class="field">${L('Boucle active', 'Active loop')}
            <select id="fd-loop">${Object.entries(LOOPS).map(([k, l]) => `<option value="${k}" ${state.loop === k ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
          <div id="fd-tools" style="display:grid;gap:2px"></div>
        </aside>
        <div class="stack" style="min-width:0">
          <div class="btn-row">
            <div id="fd-decks" class="btn-row"></div>
            <span class="spacer"></span>
            <button class="btn" data-fd="out" aria-label="${L('Dézoomer', 'Zoom out')}">−</button>
            <button class="btn" data-fd="in" aria-label="${L('Zoomer', 'Zoom in')}">+</button>
            <button class="btn" data-fd="fit">${L('Tout voir', 'Fit to view')}</button>
            <button class="btn" data-fd="undo">${L('Annuler', 'Undo')}</button>
            <button class="btn danger" data-fd="del">${L('Supprimer', 'Delete')}</button>
          </div>
          <div class="fd-canvas" id="fd-canvas"></div>
          <div class="legend" style="justify-content:flex-start">
            <span><i style="border-color:var(--series-2)"></i>${LOOP_WORD} A</span><span><i style="border-color:var(--series-1)"></i>${LOOP_WORD} B</span>
            <span>${L('Cliquez sur le plan pour poser le symbole choisi. Glissez un symbole pour le déplacer. Ctrl + molette pour zoomer.', 'Click the plan to place the chosen symbol. Drag a symbol to move it. Ctrl + mouse wheel to zoom.')}</span>
          </div>
          <section class="card">
            <div class="btn-row" style="margin-bottom:8px"><h3>${L('Nomenclature', 'Bill of materials')}</h3><span class="spacer"></span>
              <button class="btn" data-fd="csv">${L('Exporter en CSV', 'Export as CSV')}</button><button class="btn" data-fd="svg">${L('Exporter ce pont en SVG', 'Export this deck as SVG')}</button><button class="btn" data-fd="reset">${L('Recharger l’exemple', 'Reload the example')}</button></div>
            <div class="table-wrap" id="fd-bom"></div>
            <p class="note" style="margin:8px 0 0">${L('Les prix ne figurent pas dans l’outil : le chiffrage reste réalisé en interne.', 'Prices are not in the tool: costing stays an internal task.')}</p>
          </section>
        </div>
      </div>`;
      const renderDecks = () => {
        $('#fd-decks', el).innerHTML = DECKS.map((d) => `<button class="btn ${d.id === state.deck ? 'on' : ''}" data-deck="${d.id}" aria-pressed="${d.id === state.deck}">${esc(d.name)}</button>`).join('');
        $$('[data-deck]', el).forEach((b) => b.addEventListener('click', () => {
          state.deck = b.dataset.deck; state.sel = null; state.vb = { x: 0, y: 0, w: VIEW.w, h: VIEW.h };
          renderDecks(); refreshPlan();
        }));
      };
      $('#fd-loop', el).addEventListener('change', (e) => { state.loop = e.target.value; renderTools(); });
      $$('[data-fd]', el).forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.fd;
        if (act === 'in') zoom(1 / 1.3);
        if (act === 'out') zoom(1.3);
        if (act === 'fit') { state.vb = { x: 0, y: 0, w: VIEW.w, h: VIEW.h }; refreshPlan(); }
        if (act === 'del') { if (state.sel == null) toast(L('Sélectionnez d’abord un symbole avec l’outil de sélection.', 'First select a symbol with the selection tool.')); removeSelected(); }
        if (act === 'undo') {
          const prev = state.undo.pop();
          if (prev) { state.markers = JSON.parse(prev); state.sel = null; refreshPlan(); } else toast(L('Rien à annuler.', 'Nothing to undo.'));
        }
        if (act === 'reset') { state.markers = sampleMarkers(); state.undo = []; state.sel = null; refreshPlan(); }
        if (act === 'csv') {
          const types = Object.keys(SYMBOLS).filter((t) => state.markers.some((m) => m.type === t));
          const rows = [[L('Équipement', 'Equipment'), ...DECKS.map((d) => d.name), 'Total']];
          types.forEach((t) => {
            const counts = DECKS.map((d) => state.markers.filter((m) => m.type === t && m.deck === d.id).length);
            rows.push([SYMBOLS[t].label, ...counts, counts.reduce((a, c) => a + c, 0)]);
          });
          download(L('nomenclature_demo.csv', 'bill_of_materials_demo.csv'), csv(rows), 'text/csv;charset=utf-8');
        }
        if (act === 'svg') {
          const svg = $('#fd-plan', el).cloneNode(true);
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const cs = getComputedStyle(document.documentElement);
          const text = svg.outerHTML.replace(/var\((--[\w-]+)\)/g, (_, name) => cs.getPropertyValue(name).trim());
          const css = '<style>.plan-hull{fill:none;stroke:#8a97a3;stroke-width:2.2}.plan-room{fill:#eef1f4;stroke:#8a97a3}.plan-label{fill:#5f6e7c;font:12px sans-serif;text-anchor:middle}.plan-axis{stroke:#8a97a3;stroke-dasharray:10 6}</style>';
          download(`${state.deck}_demo.svg`, text.replace('>', `>${css}`), 'image/svg+xml');
        }
      }));
      renderDecks();
      renderTools();
      refreshPlan();
      document.addEventListener('keydown', App.pages.firedeck.onKey);
    },
    onKey(e) {
      if (e.target.closest && e.target.closest('input,select,textarea')) return;
      if (e.key === 'Delete') removeSelected();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const prev = state.undo.pop();
        if (prev) { state.markers = JSON.parse(prev); state.sel = null; refreshPlan(); }
        e.preventDefault();
      }
    },
    unmount() { document.removeEventListener('keydown', App.pages.firedeck.onKey); host = null; },
  };
})();
