/* PhoenixConfigAnalizer, version simulée : une flotte entièrement inventée. Le principe
   montré est celui de l'outil : réduire chaque bloc de logique à une signature
   indépendante des noms pour compter ce qui se répète d'un navire à l'autre. */
'use strict';

(() => {
  const SHIP_NAMES = ['ARGOS', 'BOREAS', 'CALYPSO', 'DELPHES', 'EOLE', 'FENRIR', 'GALATEE', 'HELIOS', 'IRIS', 'JASON', 'KORRIGAN', 'LYRA', 'MERLIN', 'NEREE', 'ORION', 'PEGASE', 'QUINTE', 'RHEA', 'SIRIUS', 'TETHYS', 'ULYSSE', 'VEGA', 'WESTERLY', 'XENIA', 'YSEULT', 'ZEPHYR', 'ALBATROS', 'BALISE', 'CORMORAN', 'DAUPHIN', 'ECUME', 'FREGATE', 'GOELAND', 'HOULE', 'ILOT', 'JUSANT', 'KRAKEN', 'LAMANEUR', 'MAREE', 'NAUTILE', 'OCEANE', 'PHARE'];
  const CLASSES = ['Ferry', 'Cargo', 'Offshore', 'Service'];
  const DEVICE_TYPES = [L('Optique', 'Optical'), L('Thermique', 'Heat'), L('Multi-capteur', 'Multi-sensor'), L('Déclencheur', 'Call point'), L('Sirène', 'Sounder'), L('Module E/S', 'I/O unit')];

  function row(g, r, tools, last) {
    tools.forEach((t, c) => { if (t) g[r][c] = { tool: t, param: '' }; });
    if (last) g[r][5] = { tool: last, param: '' };
  }
  const hline = (from, to) => Array.from({ length: to - from + 1 }, () => 'hlink');
  /* Les noms varient volontairement d'un projet à l'autre, comme sur une vraie flotte. */
  const MOTIFS = [
    { names: L(['Alarme générale', 'GA principale', 'General alarm'], ['General alarm', 'Main GA', 'Alarm - general']), weight: 0.82, build: (g) => { row(g, 0, ['fire', ...hline(1, 4)], 'sounder'); } },
    { names: L(['Sirènes par zone', 'Sirènes pont', 'Sounders zone'], ['Zone sounders', 'Deck sounders', 'Sounders per zone']), weight: 0.66, build: (g) => { row(g, 0, ['fire', 'hlink', 'hlink', 'hlink', 'vlink'], 'sounder'); row(g, 1, ['fire', ...hline(1, 4)]); } },
    { names: L(['Report timonerie', 'Sortie passerelle', 'Wheelhouse relay'], ['Wheelhouse relay', 'Bridge output', 'Bridge repeat']), weight: 0.58, build: (g) => { row(g, 0, ['fire', 'timer', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: L(['Report de défaut', 'Sortie défaut', 'Fault relay'], ['Fault relay', 'Fault output', 'Common fault']), weight: 0.51, build: (g) => { row(g, 0, ['fault', 'flash', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: L(['Arrêt ventilation', 'Coupure VMC', 'Fan shutdown'], ['Fan shutdown', 'Ventilation stop', 'HVAC cut-off']), weight: 0.38, build: (g) => { row(g, 0, ['fire', 'hlink', 'hlink', 'hlink', 'vlink'], 'output'); row(g, 1, ['fire', 'hlink', 'hlink', 'hlink', 'vlink']); row(g, 2, ['fire', ...hline(1, 4)]); } },
    { names: L(['Message machine', 'Texte ECR', 'Engine message'], ['Engine message', 'ECR text', 'Machinery notice']), weight: 0.31, build: (g) => { row(g, 0, ['tech', 'timer', 'hlink', 'hlink', 'hlink'], 'message'); } },
    { names: L(['Portes coupe-feu', 'Fermeture portes', 'Fire doors'], ['Fire doors', 'Door closing', 'Door release']), weight: 0.26, build: (g) => { row(g, 0, ['fire', 'fire', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: L(['Veille hors service', 'Signal HS', 'Disablement relay'], ['Disablement relay', 'Disabled signal', 'Out of service']), weight: 0.18, build: (g) => { row(g, 0, ['disable', 'hlink', 'hlink', 'hlink', 'hlink'], 'output'); } },
    { names: L(['Extinction locale', 'Extinction cuisine', 'Local extinguishing'], ['Local extinguishing', 'Galley extinguishing', 'Local release']), weight: 0.1, build: (g) => { row(g, 0, ['fire', 'fire', 'timer', 'hlink', 'hlink'], 'output'); row(g, 1, ['nofire', 'timer', 'hlink', 'hlink', 'hlink'], 'message'); } },
  ];
  const DEFAULT_MOTIF = { names: [L('Sorties panneau (auto)', 'Panel outputs (auto)')], isDefault: true, build: (g) => { row(g, 0, ['fire', ...hline(1, 4)], 'output'); row(g, 1, ['fault', ...hline(1, 4)], 'output'); } };

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
        blocks.push({ name: L(`Logique de bord ${i + 1}`, `Onboard logic ${i + 1}`), grid: g, isDefault: false, sig: CE.signature(g) });
      }
      const devices = {};
      const size = r.int(40, 320);
      DEVICE_TYPES.forEach((t, i) => { devices[t] = Math.round(size * [0.44, 0.13, 0.08, 0.14, 0.16, 0.05][i] * (0.75 + r() * 0.5)); });
      return { name: `MV ${n}`, cls: r.pick(CLASSES), blocks, devices };
    });
    return ships;
  }

  const state = { ships: null, cls: 'all', excl: true, tab: 'motifs', pick: null };
  let host = null;

  function aggregate() {
    const ships = state.ships.filter((s) => state.cls === 'all' || s.cls === state.cls);
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
    const quoted = names.map((n) => L(`« ${esc(n)} »`, `"${esc(n)}"`)).join(', ');
    return `<div class="btn-row" style="margin-bottom:8px"><h3>${esc(commonName(m))}</h3><span class="pill info">${L(`${m.ships.size} navire(s)`, `${m.ships.size} ship(s)`)}</span><span class="pill neutral">${L(`${m.occ.length} occurrence(s)`, `${m.occ.length} occurrence(s)`)}</span></div>
      ${names.length > 1 ? `<p class="note">${L(`Une seule signature, mais ${names.length} noms différents selon les projets : ${quoted}. C’est ce qu’une comparaison de noms aurait manqué.`, `One signature, but ${names.length} different names across projects: ${quoted}. This is what comparing names would have missed.`)}</p>` : ''}
      <div class="ce-scroll" style="margin-bottom:10px">${CE.gridHtml(m.occ[0].grid, { static: true })}</div>
      <p class="note" style="margin:0 0 4px">${L('Signature canonique', 'Canonical signature')}</p>
      <div class="sig">${m.hash} · ${esc(m.text.length > 150 ? `${m.text.slice(0, 150)}…` : m.text)}</div>`;
  }
  function render() {
    if (!host) return;
    const a = aggregate();
    if (!state.pick || !a.sigs.some((s) => s.hash === state.pick)) state.pick = a.recurring[0]?.hash || a.sigs[0]?.hash;
    $('#fl-kpis', host).innerHTML = [
      [a.ships.length, L('Navires', 'Ships')], [nf(a.devTotal), L('Équipements', 'Devices')], [a.blockCount, L('Blocs C&E', 'C&E blocks')], [a.sigs.length, L('Signatures distinctes', 'Distinct signatures')], [a.recurring.length, L('Motifs récurrents', 'Recurring patterns')],
    ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('');
    $('#fl-tabs', host).innerHTML = tabsHtml([{ id: 'motifs', label: L('Motifs C&E', 'C&E patterns') }, { id: 'comp', label: L('Composants', 'Components') }, { id: 'devices', label: L('Équipements', 'Devices') }, { id: 'ships', label: L('Navires', 'Ships') }], state.tab);
    const body = $('#fl-body', host);
    if (state.tab === 'motifs') {
      const maxShips = a.recurring[0]?.ships.size || 1;
      const m = a.sigs.find((s) => s.hash === state.pick);
      body.innerHTML = `<div class="grid two">
        <section class="card"><h3>${L('Motifs récurrents, par nombre de navires', 'Recurring patterns, by number of ships')}</h3>
          <div>${a.recurring.slice(0, 12).map((x) => `<button class="motif-row ${x.hash === state.pick ? 'on' : ''}" data-pick="${x.hash}"><span>${esc(commonName(x))}</span><span class="bar"><i style="width:${(x.ships.size / maxShips) * 100}%"></i></span><span class="muted" style="text-align:right">${x.ships.size} ${L('navires', 'ships')}</span></button>`).join('')}</div>
        </section>
        <section class="card">${m ? motifDetail(m) : L('Aucun bloc.', 'No block.')}</section>
      </div>`;
      $$('[data-pick]', body).forEach((b) => b.addEventListener('click', () => { state.pick = b.dataset.pick; render(); }));
    } else if (state.tab === 'comp') {
      const maxS = a.comp[0]?.ships.size || 1;
      body.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>${L('Composant', 'Component')}</th><th>${L('Navires qui l’utilisent', 'Ships using it')}</th><th class="num">${L('Cases remplies', 'Cells filled')}</th></tr></thead>
        <tbody>${a.comp.map((c) => `<tr><td>${esc(CE.TOOLS[c.tool].label)}</td><td><span class="bar-mini"><i style="width:${(c.ships.size / maxS) * 100}%"></i></span>${c.ships.size}</td><td class="num">${c.cells}</td></tr>`).join('')}</tbody></table></div>
        <p class="note" style="margin-top:8px">${L('Savoir quelles briques la flotte utilise vraiment aide à prioriser la migration vers la nouvelle gamme.', 'Knowing which building blocks the fleet really uses helps prioritise the migration to the new product range.')}</p>`;
    } else if (state.tab === 'devices') {
      const rows = Object.entries(a.devices).sort((x, y) => y[1] - x[1]);
      const max = rows[0]?.[1] || 1;
      body.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Type</th><th>${L('Quantité sur la flotte', 'Quantity across the fleet')}</th><th class="num">${L('Part', 'Share')}</th></tr></thead>
        <tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td><span class="bar-mini"><i style="width:${(v / max) * 100}%"></i></span>${nf(v)}</td><td class="num">${L(`${nf((v / a.devTotal) * 100, 1)} %`, `${nf((v / a.devTotal) * 100, 1)}%`)}</td></tr>`).join('')}</tbody></table></div>`;
    } else {
      body.innerHTML = `<div class="table-wrap" style="max-height:460px"><table class="data"><thead><tr><th>${L('Navire (fictif)', 'Ship (fictional)')}</th><th>${L('Catégorie', 'Category')}</th><th class="num">${L('Équipements', 'Devices')}</th><th class="num">${L('Blocs C&E', 'C&E blocks')}</th></tr></thead>
        <tbody>${a.ships.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.cls}</td><td class="num">${nf(Object.values(s.devices).reduce((x, y) => x + y, 0))}</td><td class="num">${s.blocks.filter((b) => !(state.excl && b.isDefault)).length}</td></tr>`).join('')}</tbody></table></div>`;
    }
  }
  App.pages.fleet = {
    title: 'PhoenixConfigAnalizer',
    mount(el) {
      host = el;
      if (!state.ships) state.ships = generate();
      el.innerHTML = `<header class="page-head">
        <div class="kicker">${L('Reconnaissance · C#, WPF · Sans dépendance', 'Reconnaissance · C#, WPF · No dependencies')}</div>
        <h1>PhoenixConfigAnalizer</h1>
        <p>${L('Avant de migrer un parc de navires vers une nouvelle gamme, encore faut-il savoir ce qu’il contient. Chaque bloc de logique est réduit à une signature canonique, indépendante des noms et des identifiants, ce qui permet de compter combien de navires réutilisent la même logique.', 'Before migrating a fleet to a new product range, you need to know what it contains. Each logic block is reduced to a canonical signature, independent of names and identifiers, which makes it possible to count how many ships reuse the same logic.')}</p>
      </header>
      ${simBanner(L('Les 42 navires, leurs noms et leurs blocs sont inventés. Le nombre de navires et les statistiques ne reflètent pas le parc réel.', 'The 42 ships, their names and their blocks are made up. The number of ships and the statistics do not reflect the real fleet.'))}
      <div class="stack">
        <div class="btn-row">
          <label class="check">${L('Catégorie', 'Category')} <select id="fl-cls" style="margin-left:6px"><option value="all" ${state.cls === 'all' ? 'selected' : ''}>${L('Toutes', 'All')}</option>${CLASSES.map((c) => `<option value="${c}" ${c === state.cls ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="check"><input type="checkbox" id="fl-excl" ${state.excl ? 'checked' : ''}> ${L('Exclure les blocs auto-générés', 'Exclude auto-generated blocks')}</label>
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
