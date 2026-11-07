/* PhoenixConfigAnalizer, version simulée : une flotte entièrement inventée. Le principe
   montré est celui de l'outil : réduire chaque bloc de logique à une signature
   indépendante des noms pour compter ce qui se répète d'un navire à l'autre. */
'use strict';

(() => {
  const SHIP_NAMES = ['ARGOS', 'BOREAS', 'CALYPSO', 'DELPHES', 'EOLE', 'FENRIR', 'GALATEE', 'HELIOS', 'IRIS', 'JASON', 'KORRIGAN', 'LYRA', 'MERLIN', 'NEREE', 'ORION', 'PEGASE', 'QUINTE', 'RHEA', 'SIRIUS', 'TETHYS', 'ULYSSE', 'VEGA', 'WESTERLY', 'XENIA', 'YSEULT', 'ZEPHYR', 'ALBATROS', 'BALISE', 'CORMORAN', 'DAUPHIN', 'ECUME', 'FREGATE', 'GOELAND', 'HOULE', 'ILOT', 'JUSANT', 'KRAKEN', 'LAMANEUR', 'MAREE', 'NAUTILE', 'OCEANE', 'PHARE'];
  const CLASSES = ['Ferry', 'Cargo', 'Offshore', 'Service'];
  const DEVICE_TYPES = ['Optique', 'Thermique', 'Multi-capteur', 'Déclencheur', 'Sirène', 'Module E/S'];

  function row(g, r, tools, last) {
    tools.forEach((t, c) => { if (t) g[r][c] = { tool: t, param: '' }; });
    if (last) g[r][5] = { tool: last, param: '' };
  }
  const hline = (from, to) => Array.from({ length: to - from + 1 }, () => 'hlink');
  const MOTIFS = [
    { names: ['Alarme générale', 'GA principale', 'General alarm'], weight: 0.82, build: (g) => { row(g, 0, ['fire', ...hline(1, 4)], 'sounder'); } },
    { names: ['Sirènes par zone', 'Sirènes pont', 'Sounders zone'], weight: 0.66, build: (g) => { row(g, 0, ['fire', 'hlink', 'hlink', 'hlink', 'vlink'], 'sounder'); row(g, 1, ['fire', ...hline(1, 4)]); } },
    { names: ['Report timonerie', 'Sortie passerelle', 'Wheelhouse relay'], weight: 0.58, build: (g) => { row(g, 0, ['fire', 'timer', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: ['Report de défaut', 'Sortie défaut', 'Fault relay'], weight: 0.51, build: (g) => { row(g, 0, ['fault', 'flash', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: ['Arrêt ventilation', 'Coupure VMC', 'Fan shutdown'], weight: 0.38, build: (g) => { row(g, 0, ['fire', 'hlink', 'hlink', 'hlink', 'vlink'], 'output'); row(g, 1, ['fire', 'hlink', 'hlink', 'hlink', 'vlink']); row(g, 2, ['fire', ...hline(1, 4)]); } },
    { names: ['Message machine', 'Texte ECR', 'Engine message'], weight: 0.31, build: (g) => { row(g, 0, ['tech', 'timer', 'hlink', 'hlink', 'hlink'], 'message'); } },
    { names: ['Portes coupe-feu', 'Fermeture portes', 'Fire doors'], weight: 0.26, build: (g) => { row(g, 0, ['fire', 'fire', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: ['Veille hors service', 'Signal HS', 'Disablement relay'], weight: 0.18, build: (g) => { row(g, 0, ['disable', 'hlink', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: ['Extinction locale', 'Extinction cuisine', 'Local extinguishing'], weight: 0.1, build: (g) => { row(g, 0, ['fire', 'fire', 'timer', 'hlink', 'hlink'], 'output'); row(g, 1, ['nofire', 'timer', 'hlink', 'hlink', 'hlink'], 'message'); } },
  ];
  const DEFAULT_MOTIF = { names: ['Sorties panneau (auto)'], isDefault: true, build: (g) => { row(g, 0, ['fire', ...hline(1, 4)], 'output'); row(g, 1, ['fault', ...hline(1, 4)], 'output'); } };

  function generate() {
    const r = rng(1234);
    const ships = SHIP_NAMES.map((n) => {
      const blocks = [];
      const addFrom = (m) => {
        const grid = CE.emptyGrid();
        m.build(grid);
        grid.flat().forEach((cell) => {
          if (!cell) return;
          if (['fire', 'fault', 'disable', 'nofire'].includes(cell.tool)) cell.param = `Z${pad(r.int(1, 40), 3)}`;
          if (cell.tool === 'tech') cell.param = `01A${pad(r.int(1, 126), 3)}`;
          if (cell.tool === 'output') cell.param = `PO_${pad(r.int(1, 16))}`;
          if (cell.tool === 'sounder') cell.param = `G${r.int(1, 4)}`;
          if (cell.tool === 'message') cell.param = `M${r.int(1, 10)}`;
          if (cell.tool === 'timer') cell.param = `${r.pick([5, 10, 30, 60])} s`;
        });
        blocks.push({ name: r.pick(m.names), grid, isDefault: !!m.isDefault, sig: CE.signature(grid) });
      };
      addFrom(DEFAULT_MOTIF);
      MOTIFS.forEach((m) => { if (r() < m.weight) addFrom(m); });
      /* Quelques blocs uniques, propres à un navire */
      const uniques = r.int(0, 3);
      for (let i = 0; i < uniques; i++) {
        const g = CE.emptyGrid();
        const len = r.int(1, 4);
        const tools = Array.from({ length: len }, () => r.pick(['fire', 'fault', 'tech', 'timer', 'flash', 'hlink']));
        row(g, r.int(0, 2), ['fire', ...tools], r.pick(['output', 'message', 'sounder']));
        blocks.push({ name: `Logique de bord ${i + 1}`, grid: g, isDefault: false, sig: CE.signature(g) });
      }
      const devices = {};
      const size = r.int(40, 320);
      DEVICE_TYPES.forEach((t, i) => { devices[t] = Math.round(size * [0.44, 0.13, 0.08, 0.14, 0.16, 0.05][i] * (0.75 + r() * 0.5)); });
      return { name: `MV ${n}`, cls: r.pick(CLASSES), blocks, devices };
    });
    return ships;
  }

  const state = { ships: null, cls: 'Toutes', excl: true, tab: 'motifs', pick: null };
  let host = null;

  function aggregate() {
    const ships = state.ships.filter((s) => state.cls === 'Toutes' || s.cls === state.cls);
    const sigs = new Map();
    let blockCount = 0;
    ships.forEach((s) => s.blocks.forEach((b) => {
      if (state.excl && b.isDefault) return;
      blockCount += 1;
      const e = sigs.get(b.sig.hash) || { hash: b.sig.hash, text: b.sig.text, grid: b.grid, ships: new Set(), occ: [] };
      e.ships.add(s.name);
      e.occ.push({ ship: s.name, name: b.name, grid: b.grid });
      sigs.set(b.sig.hash, e);
    }));
    const list = [...sigs.values()].sort((a, b) => b.ships.size - a.ships.size || b.occ.length - a.occ.length);
    const recurring = list.filter((m) => m.ships.size > 1);
    const devices = {};
    const comp = new Map();
    let devTotal = 0;
    ships.forEach((s) => {
      Object.entries(s.devices).forEach(([k, v]) => { devices[k] = (devices[k] || 0) + v; devTotal += v; });
      s.blocks.forEach((b) => {
        if (state.excl && b.isDefault) return;
        b.grid.flat().forEach((c) => {
          if (!c || ['hlink', 'vlink'].includes(c.tool)) return;
          const e = comp.get(c.tool) || { tool: c.tool, cells: 0, ships: new Set() };
          e.cells += 1; e.ships.add(s.name);
          comp.set(c.tool, e);
        });
      });
    });
    return { ships, sigs: list, recurring, blockCount, devices, devTotal, comp: [...comp.values()].sort((a, b) => b.ships.size - a.ships.size || b.cells - a.cells) };
  }
  const commonName = (m) => {
    const c = new Map();
    m.occ.forEach((o) => c.set(o.name, (c.get(o.name) || 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };
  function motifDetail(m) {
    const names = [...new Set(m.occ.map((o) => o.name))];
    return `<div class="btn-row" style="margin-bottom:8px"><h3>${esc(commonName(m))}</h3><span class="pill info">${m.ships.size} navire(s)</span><span class="pill neutral">${m.occ.length} occurrence(s)</span></div>
      ${names.length > 1 ? `<p class="note">Une seule signature, mais ${names.length} noms différents selon les projets : ${names.map((n) => `« ${esc(n)} »`).join(', ')}. C’est ce qu’une comparaison de noms aurait manqué.</p>` : ''}
      <div class="ce-scroll" style="margin-bottom:10px">${CE.gridHtml(m.occ[0].grid, { static: true })}</div>
      <p class="note" style="margin:0 0 4px">Signature canonique</p>
      <div class="sig">${m.hash} · ${esc(m.text.length > 150 ? `${m.text.slice(0, 150)}…` : m.text)}</div>`;
  }
  function render() {
    if (!host) return;
    const a = aggregate();
    if (!state.pick || !a.sigs.some((s) => s.hash === state.pick)) state.pick = a.recurring[0]?.hash || a.sigs[0]?.hash;
    $('#fl-kpis', host).innerHTML = [
      [a.ships.length, 'Navires'], [nf(a.devTotal), 'Équipements'], [a.blockCount, 'Blocs C&E'], [a.sigs.length, 'Signatures distinctes'], [a.recurring.length, 'Motifs récurrents'],
    ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('');
    $('#fl-tabs', host).innerHTML = tabsHtml([{ id: 'motifs', label: 'Motifs C&E' }, { id: 'comp', label: 'Composants' }, { id: 'devices', label: 'Équipements' }, { id: 'ships', label: 'Navires' }], state.tab);
    const body = $('#fl-body', host);
    if (state.tab === 'motifs') {
      const maxShips = a.recurring[0]?.ships.size || 1;
      const m = a.sigs.find((s) => s.hash === state.pick);
      body.innerHTML = `<div class="grid two">
        <section class="card"><h3>Motifs récurrents, par nombre de navires</h3>
          <div>${a.recurring.slice(0, 12).map((x) => `<button class="motif-row ${x.hash === state.pick ? 'on' : ''}" data-pick="${x.hash}"><span>${esc(commonName(x))}</span><span class="bar"><i style="width:${(x.ships.size / maxShips) * 100}%"></i></span><span class="muted" style="text-align:right">${x.ships.size} navires</span></button>`).join('')}</div>
        </section>
        <section class="card">${m ? motifDetail(m) : 'Aucun bloc.'}</section>
      </div>`;
      $$('[data-pick]', body).forEach((b) => b.addEventListener('click', () => { state.pick = b.dataset.pick; render(); }));
    } else if (state.tab === 'comp') {
      const maxS = a.comp[0]?.ships.size || 1;
      body.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Composant</th><th>Navires qui l’utilisent</th><th class="num">Cases remplies</th></tr></thead>
        <tbody>${a.comp.map((c) => `<tr><td>${esc(CE.TOOLS[c.tool].label)}</td><td><span class="bar-mini"><i style="width:${(c.ships.size / maxS) * 100}%"></i></span>${c.ships.size}</td><td class="num">${c.cells}</td></tr>`).join('')}</tbody></table></div>
        <p class="note" style="margin-top:8px">Savoir quelles briques la flotte utilise vraiment aide à prioriser la migration vers la nouvelle gamme.</p>`;
    } else if (state.tab === 'devices') {
      const rows = Object.entries(a.devices).sort((x, y) => y[1] - x[1]);
      const max = rows[0]?.[1] || 1;
      body.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Type</th><th>Quantité sur la flotte</th><th class="num">Part</th></tr></thead>
        <tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td><span class="bar-mini"><i style="width:${(v / max) * 100}%"></i></span>${nf(v)}</td><td class="num">${nf((v / a.devTotal) * 100, 1)} %</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      body.innerHTML = `<div class="table-wrap" style="max-height:460px"><table class="data"><thead><tr><th>Navire (fictif)</th><th>Catégorie</th><th class="num">Équipements</th><th class="num">Blocs C&E</th></tr></thead>
        <tbody>${a.ships.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.cls}</td><td class="num">${nf(Object.values(s.devices).reduce((x, y) => x + y, 0))}</td><td class="num">${s.blocks.filter((b) => !(state.excl && b.isDefault)).length}</td></tr>`).join('')}</tbody></table></div>`;
    }
  }
  App.pages.fleet = {
    title: 'PhoenixConfigAnalizer',
    mount(el) {
      host = el;
      if (!state.ships) state.ships = generate();
      el.innerHTML = `<header class="page-head">
        <div class="kicker">Reconnaissance · C#, WPF · Sans dépendance</div>
        <h1>PhoenixConfigAnalizer</h1>
        <p>Avant de migrer un parc de navires vers une nouvelle gamme, encore faut-il savoir ce qu’il contient. Chaque bloc de logique est réduit à une signature canonique, indépendante des noms et des identifiants, ce qui permet de compter combien de navires réutilisent la même logique.</p>
      </header>
      ${simBanner('Les 42 navires, leurs noms et leurs blocs sont inventés. Le nombre de navires et les statistiques ne reflètent pas le parc réel.')}
      <div class="stack">
        <div class="btn-row">
          <label class="check">Catégorie <select id="fl-cls" style="margin-left:6px">${['Toutes', ...CLASSES].map((c) => `<option ${c === state.cls ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="check"><input type="checkbox" id="fl-excl" ${state.excl ? 'checked' : ''}> Exclure les blocs auto-générés</label>
        </div>
        <div class="kpis" id="fl-kpis" style="margin:0"></div>
        <div><div id="fl-tabs"></div><div id="fl-body"></div></div>
      </div>`;
      $('#fl-cls', el).addEventListener('change', (e) => { state.cls = e.target.value; render(); });
      $('#fl-excl', el).addEventListener('change', (e) => { state.excl = e.target.checked; render(); });
      $('#fl-tabs', el).addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { state.tab = t.dataset.tab; render(); } });
      render();
    },
    unmount() { host = null; },
  };
})();
