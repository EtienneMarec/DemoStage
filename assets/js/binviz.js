/* FoxBinVisualizer, version simulée. Le format « DEMO » est inventé pour cette
   page : il n'a ni la structure, ni la taille, ni le contrôle du format réel. */
'use strict';

const BinDemo = (() => {
  const SLOTS = { cpu: 4, zone: 16, device: 64, block: 6 };
  const SCHEMA = {
    1: [
      ['En-tête', 'MAGIC', 'char', 4], ['En-tête', 'FORMAT_REV', 'u8'], ['En-tête', 'CHECKSUM', 'u16'],
      ['En-tête', 'SHIP_NAME', 'char', 18], ['En-tête', 'SHIP_IMO', 'char', 7],
      ['En-tête', 'CPU_COUNT', 'u8'], ['En-tête', 'ZONE_COUNT', 'u8'], ['En-tête', 'DEVICE_COUNT', 'u16'],
    ],
    repeat: [
      ['CPU', SLOTS.cpu, [['NAME', 'char', 6], ['HMI_COUNT', 'u8'], ['LOOP_MODULES', 'u8'], ['IO_MODULES', 'u8']]],
      ['Zone', SLOTS.zone, [['NAME', 'char', 18]]],
      ['Point', SLOTS.device, [['ADDRESS', 'char', 6], ['TYPE', 'u8'], ['MODE', 'u8'], ['ZONE', 'u8'], ['NAME', 'char', 10]]],
    ],
    /* La révision 2 ajoute une section, comme une nouvelle révision de spécification pourrait le faire. */
    extra: [['Bloc C&E', SLOTS.block, [['NAME', 'char', 16], ['CELLS_USED', 'u8']]]],
  };
  const TYPE_CODES = ['—', 'Optique', 'Thermique', 'Multi-capteur', 'Déclencheur', 'Sirène', 'Sirène-flash', 'Module E/S'];
  const TYPE_KEYS = [null, 'OPT', 'HEAT', 'MULTI', 'MCP', 'SND', 'BCN', 'IOU'];

  function layout(rev) {
    const fields = [];
    let off = 0;
    const add = (section, name, type, len = 1) => {
      const size = type === 'char' ? len : type === 'u16' ? 2 : 1;
      fields.push({ section, name, type, len, offset: off, size });
      off += size;
    };
    SCHEMA[1].forEach(([s, n, t, l]) => add(s, n, t, l));
    const groups = rev >= 2 ? [...SCHEMA.repeat.slice(0, 2), ...SCHEMA.extra, SCHEMA.repeat[2]] : SCHEMA.repeat;
    groups.forEach(([sec, count, items]) => {
      for (let i = 1; i <= count; i++) items.forEach(([n, t, l]) => add(`${sec} ${pad(i)}`, n, t, l));
    });
    return { fields, size: off };
  }
  const SIZE = { 1: layout(1).size, 2: layout(2).size };
  const fieldAt = (fields, section, name) => fields.find((f) => f.section === section && f.name === name);

  function writeField(bytes, f, v) {
    if (f.type === 'char') {
      const s = String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, f.len);
      for (let i = 0; i < f.len; i++) bytes[f.offset + i] = i < s.length ? s.charCodeAt(i) & 0x7f : 0;
    } else if (f.type === 'u16') {
      bytes[f.offset] = v & 0xff;
      bytes[f.offset + 1] = (v >> 8) & 0xff;
    } else bytes[f.offset] = v & 0xff;
  }
  const CHECK = Checksums['CRC-16/CCITT-FALSE'];
  /* Le contrôle couvre tout le fichier, champ CHECKSUM compris mis à zéro. */
  function computeCheck(bytes, fields) {
    const f = fieldAt(fields, 'En-tête', 'CHECKSUM');
    const copy = bytes.slice();
    copy[f.offset] = 0; copy[f.offset + 1] = 0;
    return CHECK(copy).value;
  }
  function build(rev, spec) {
    const { fields, size } = layout(rev);
    const bytes = new Uint8Array(size);
    const put = (section, name, v) => writeField(bytes, fieldAt(fields, section, name), v);
    put('En-tête', 'MAGIC', 'DEMO');
    put('En-tête', 'FORMAT_REV', rev);
    put('En-tête', 'SHIP_NAME', spec.ship);
    put('En-tête', 'SHIP_IMO', spec.imo);
    put('En-tête', 'CPU_COUNT', spec.cpus.length);
    put('En-tête', 'ZONE_COUNT', spec.zones.length);
    put('En-tête', 'DEVICE_COUNT', spec.devices.length);
    spec.cpus.slice(0, SLOTS.cpu).forEach((c, i) => {
      const s = `CPU ${pad(i + 1)}`;
      put(s, 'NAME', c.name); put(s, 'HMI_COUNT', c.hmi); put(s, 'LOOP_MODULES', c.lm); put(s, 'IO_MODULES', c.io);
    });
    spec.zones.slice(0, SLOTS.zone).forEach((z, i) => put(`Zone ${pad(i + 1)}`, 'NAME', z));
    spec.devices.slice(0, SLOTS.device).forEach((d, i) => {
      const s = `Point ${pad(i + 1)}`;
      put(s, 'ADDRESS', d.addr); put(s, 'TYPE', d.type); put(s, 'MODE', d.mode); put(s, 'ZONE', d.zone); put(s, 'NAME', d.name);
    });
    if (rev >= 2) {
      (spec.blocks || []).slice(0, SLOTS.block).forEach((b, i) => {
        const s = `Bloc C&E ${pad(i + 1)}`;
        put(s, 'NAME', b.name); put(s, 'CELLS_USED', b.cells);
      });
    }
    writeField(bytes, fieldAt(fields, 'En-tête', 'CHECKSUM'), computeCheck(bytes, fields));
    return bytes;
  }
  function fromProject(p) {
    const cpus = [];
    const devices = [];
    p.cpus.forEach((c, pos) => {
      if (!c) return;
      cpus.push({ name: c.name, hmi: c.hmi, lm: c.lm, io: c.io });
      Object.entries(c.loops).forEach(([l, list]) => list.forEach((d) => {
        devices.push({ addr: `${pad(pos + 1)}${l}${pad(d.pt, 3)}`, type: Math.max(0, TYPE_KEYS.indexOf(d.type)), mode: d.mode, zone: d.zone || 0, name: d.name });
      }));
    });
    return { bytes: build(2, { ship: p.ship.name, imo: p.ship.imo, cpus, zones: p.zones.map((z) => z.name), devices, blocks: p.blocks.map((b) => ({ name: b.name, cells: b.grid.flat().filter(Boolean).length })) }), label: `Export de « ${p.ship.name} »` };
  }
  function sampleSpec(variant) {
    const devices = [];
    const names = ['Passerelle', 'Couloir', 'Cabine 1', 'Cabine 2', 'Cuisine', 'Salon', 'Machine', 'Atelier', 'Cale'];
    names.forEach((name, i) => {
      devices.push({ addr: `01A${pad(i + 1, 3)}`, type: (i % 6) + 1, mode: 3, zone: (i % 4) + 1, name });
    });
    const spec = { ship: 'MV DEMONSTRATOR', imo: '1234567', cpus: [{ name: 'CPU01', hmi: 2, lm: 2, io: 1 }, { name: 'CPU02', hmi: 1, lm: 1, io: 0 }], zones: ['Passerelle', 'Machine', 'Cabines', 'Cuisine'], devices, blocks: [{ name: 'Alarme generale', cells: 7 }, { name: 'Report defaut', cells: 6 }] };
    if (variant === 'B') {
      spec.ship = 'MV DEMONSTRATOR 2';
      spec.cpus[0].io = 2;
      spec.devices[4].type = 7;
      spec.devices[6].name = 'Machine AV';
      spec.zones[3] = 'Galley';
    }
    return spec;
  }
  function decode(bytes) {
    const rev = bytes.length === SIZE[2] ? 2 : 1;
    const { fields } = layout(rev);
    const known = bytes.length === SIZE[1] || bytes.length === SIZE[2];
    const rows = fields.filter((f) => f.offset + f.size <= bytes.length).map((f) => {
      const raw = bytes.slice(f.offset, f.offset + f.size);
      let value;
      if (f.type === 'char') {
        let s = '';
        for (const b of raw) { if (!b) break; s += String.fromCharCode(b); }
        value = `"${s}"`;
      } else if (f.type === 'u16') value = raw[0] | (raw[1] << 8);
      else value = raw[0];
      let display = value;
      if (f.name === 'CHECKSUM') display = `0x${hex(value, 4)}`;
      if (f.section.startsWith('Point') && f.name === 'TYPE') display = `${value} (${TYPE_CODES[value] || '?'})`;
      return { ...f, raw, value: String(display), empty: raw.every((b) => b === 0) };
    });
    const check = fieldAt(fields, 'En-tête', 'CHECKSUM');
    const stored = bytes[check.offset] | (bytes[check.offset + 1] << 8);
    return { rev, rows, known, stored, computed: computeCheck(bytes, fields), key: (r) => `${r.section}/${r.name}` };
  }
  return { build, fromProject, sampleSpec, decode, SIZE };
})();

(() => {
  const state = { filter: '', diffOnly: false, hideEmpty: true, a: null, b: null, aLabel: '', bLabel: '' };

  function loadSamples() {
    state.a = BinDemo.build(2, BinDemo.sampleSpec('A'));
    state.aLabel = 'demo_A.bin';
    state.b = BinDemo.build(2, BinDemo.sampleSpec('B'));
    state.bLabel = 'demo_B.bin';
  }
  function statusPill(d) {
    const ok = d.stored === d.computed;
    return `<span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'Contrôle OK' : `Contrôle KO : lu 0x${hex(d.stored, 4)}, calculé 0x${hex(d.computed, 4)}`}</span>`;
  }
  function renderTable(host) {
    const A = BinDemo.decode(state.a);
    const B = state.b ? BinDemo.decode(state.b) : null;
    const bMap = B ? new Map(B.rows.map((r) => [B.key(r), r])) : null;
    const q = state.filter.toLowerCase();
    const keysA = new Set(A.rows.map((r) => A.key(r)));
    const merged = [...A.rows];
    if (B) B.rows.forEach((r) => { if (!keysA.has(B.key(r))) merged.push({ ...r, onlyB: true }); });
    let diffCount = 0;
    const rows = merged.map((r) => {
      const other = r.onlyB ? r : bMap ? bMap.get(A.key(r)) : null;
      const isDiff = B ? r.onlyB || !other || hexBytes(r.raw) !== hexBytes(other.raw) : false;
      if (isDiff) diffCount += 1;
      return { r, other, isDiff };
    }).filter(({ r, other, isDiff }) => {
      if (state.diffOnly && !isDiff) return false;
      if (state.hideEmpty && r.empty && (!other || other.empty)) return false;
      if (q && !`${r.section} ${r.name} ${r.value} ${other ? other.value : ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const cut = (r) => { const h = hexBytes(r.raw); return h.length > 26 ? `${h.slice(0, 24)}…` : h; };
    $('#bv-status', host).innerHTML = `
      <span><strong>A</strong> ${esc(state.aLabel)} · ${nf(state.a.length)} octets · rév. ${A.rev}</span> ${statusPill(A)}
      ${B ? `<span style="margin-left:10px"><strong>B</strong> ${esc(state.bLabel)} · ${nf(state.b.length)} octets · rév. ${B.rev}</span> ${statusPill(B)}
      <span class="pill ${diffCount ? 'warn' : 'ok'}" style="margin-left:10px">${diffCount} champ(s) divergent(s)</span>` : ''}`;
    $('#bv-rows', host).innerHTML = rows.slice(0, 500).map(({ r, other, isDiff }) => `<tr class="${isDiff ? 'diff' : ''}">
      <td class="mono">${r.onlyB ? '–' : `${r.offset} (0x${hex(r.offset, 4)})`}</td><td>${esc(r.section)}</td><td class="mono">${esc(r.name)}</td><td class="mono">${r.type}${r.type === 'char' ? `[${r.len}]` : ''}</td>
      <td class="val mono">${r.onlyB ? '–' : esc(r.value)}</td><td class="hexv">${r.onlyB ? '–' : cut(r)}</td>
      ${B ? `<td class="val mono">${other ? esc(other.value) : '–'}</td><td class="hexv">${other ? cut(other) : '–'}</td>` : ''}</tr>`).join('');
    $('#bv-head', host).innerHTML = `<tr><th>Position</th><th>Section</th><th>Champ</th><th>Type</th><th>Valeur A</th><th>Hex A</th>${B ? '<th>Valeur B</th><th>Hex B</th>' : ''}</tr>`;
    $('#bv-count', host).textContent = `${rows.length} ligne(s) affichée(s)`;
  }

  App.pages.binviz = {
    title: 'FoxBinVisualizer',
    mount(el) {
      if (!state.a) loadSamples();
      if (App.shared.exportedBin) {
        state.a = App.shared.exportedBin.bytes;
        state.aLabel = App.shared.exportedBin.label;
        state.b = null;
        state.diffOnly = false;
        App.shared.exportedBin = null;
      }
      el.innerHTML = `<header class="page-head">
        <div class="kicker">Outil de débogage · C#, WPF · Lecture seule</div>
        <h1>FoxBinVisualizer</h1>
        <p>Un matin passé à déboguer un fichier binaire à la main a donné cet outil : il décode chaque champ selon la spécification et met deux fichiers côte à côte. Il a été déterminant pour fiabiliser l’import et l’export, car le moindre octet décalé rend une configuration illisible.</p>
      </header>
      ${simBanner('Le format « DEMO » et ses noms de champs sont inventés, et le contrôle est un CRC public. Le format réel n’est pas publié.')}
      <div class="stack">
        <div class="card stack" style="gap:10px">
          <div class="btn-row">
            <button class="btn" data-bv="samples">Charger A et B</button>
            <button class="btn" data-bv="single">A seul</button>
            <button class="btn" data-bv="corrupt" title="Inverse un octet du fichier A">Corrompre un octet de A</button>
            <a class="btn" href="#/foxsoft">Exporter depuis FOX_Soft</a>
            <span class="spacer"></span>
            <input id="bv-filter" type="search" placeholder="Filtrer" aria-label="Filtrer les champs" value="${esc(state.filter)}" style="width:150px">
            <label class="check"><input type="checkbox" id="bv-diff" ${state.diffOnly ? 'checked' : ''}> Écarts seuls</label>
            <label class="check"><input type="checkbox" id="bv-empty" ${state.hideEmpty ? 'checked' : ''}> Masquer les vides</label>
          </div>
          <div class="btn-row" id="bv-status" style="font-size:13px"></div>
        </div>
        <div class="table-wrap bin-table"><table class="data"><thead id="bv-head"></thead><tbody id="bv-rows"></tbody></table></div>
        <p class="note" id="bv-count" style="margin:0"></p>
      </div>`;
      const refresh = () => renderTable(el);
      $('#bv-filter', el).addEventListener('input', (e) => { state.filter = e.target.value; refresh(); });
      $('#bv-diff', el).addEventListener('change', (e) => { state.diffOnly = e.target.checked; refresh(); });
      $('#bv-empty', el).addEventListener('change', (e) => { state.hideEmpty = e.target.checked; refresh(); });
      $$('[data-bv]', el).forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.bv;
        if (act === 'samples') loadSamples();
        if (act === 'single') { state.b = null; state.diffOnly = false; $('#bv-diff', el).checked = false; }
        if (act === 'corrupt') {
          const pos = 40 + Math.floor(Math.random() * 60);
          state.a = state.a.slice();
          state.a[pos] ^= 0x20;
          toast(`Octet ${pos} modifié : le contrôle d’intégrité détecte l’altération.`);
        }
        refresh();
      }));
      refresh();
    },
  };
})();
