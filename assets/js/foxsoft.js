/* FOX_Soft, version simulée : configuration d'une installation de navire.
   Les limites de capacité reprennent celles visibles dans l'application ;
   les consommations et les noms de cet exemple sont fictifs. */
'use strict';

const Fox = (() => {
  const LIMITS = { cpus: 4, hmisTotal: 4, hmisPerCpu: 3, lmsPerCpu: 3, iosPerCpu: 2, perLoop: 126, perStation: 512, loopMa: 500, blocks: 32 };
  const TYPES = {
    OPT: { label: L('Détecteur optique', 'Optical detector'), sb: 0.35, al: 2.6 },
    HEAT: { label: L('Détecteur thermique', 'Heat detector'), sb: 0.3, al: 2.4 },
    MULTI: { label: L('Multi-capteur', 'Multi-sensor'), sb: 0.45, al: 3.1 },
    MCP: { label: L('Déclencheur manuel', 'Manual call point'), sb: 0.25, al: 1.8 },
    SND: { label: L('Base sirène', 'Sounder base'), sb: 0.6, al: 9.5, sounder: true },
    BCN: { label: L('Base sirène-flash', 'Sounder-beacon base'), sb: 0.7, al: 13, sounder: true },
    IOU: { label: L('Module E/S adressable', 'Addressable I/O unit'), sb: 0.5, al: 4 },
  };
  const VOLUMES = [L('Bas', 'Low'), L('Moyen', 'Medium'), L('Fort', 'High')];
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const state = { project: null, tab: 'topo', loop: { pos: 0, letter: 'A' }, sel: new Set(), anchor: null, clip: [], ce: { block: 0, tool: null, cell: null, sim: false, active: {} }, imported: {} };

  const devName = (pos, l, pt) => `P${pad(pos + 1)}${l}${pad(pt, 3)}`;
  const devAddr = (pos, l, pt) => `${pad(pos + 1)}${l}${pad(pt, 3)}`;

  function newCpu(pos, hmi = 0, lm = 1, io = 0) {
    return { name: `CPU${pad(pos + 1)}`, hmi, lm, io, loops: Object.fromEntries(LETTERS.map((l) => [l, []])) };
  }
  function seedLoop(cpu, pos, letter, n, r, zones) {
    const mix = ['OPT', 'OPT', 'OPT', 'HEAT', 'MULTI', 'MCP', 'SND', 'BCN', 'IOU'];
    for (let pt = 1; pt <= n; pt++) {
      const type = r.pick(mix);
      cpu.loops[letter].push({ pt, name: devName(pos, letter, pt), type, mode: r.int(1, 5), zone: zones[(pt - 1) % zones.length], vol: TYPES[type].sounder ? r.int(0, 2) : null });
    }
  }
  function sampleBlocks() {
    const blocks = [
      { group: L('Alarme générale', 'General alarm'), name: L('Feu cuisine ou machine', 'Galley or engine fire'), grid: CE.emptyGrid() },
      { group: L('Alarme générale', 'General alarm'), name: L('Sirènes temporisées', 'Delayed sounders'), grid: CE.emptyGrid() },
      { group: L('Sorties', 'Outputs'), name: L('Report de défaut', 'Fault relay'), grid: CE.emptyGrid() },
    ];
    let g = blocks[0].grid;
    g[0][0] = { tool: 'fire', param: 'Z005' }; g[1][0] = { tool: 'fire', param: 'Z002' };
    for (let c = 1; c < 4; c++) { g[0][c] = { tool: 'hlink' }; g[1][c] = { tool: 'hlink' }; }
    g[0][4] = { tool: 'vlink' }; g[1][4] = { tool: 'hlink' };
    g[0][5] = { tool: 'output', param: 'PO_01' };
    g = blocks[1].grid;
    g[0][0] = { tool: 'fire', param: 'Z001' }; g[0][1] = { tool: 'timer', param: '30 s' };
    for (let c = 2; c < 5; c++) g[0][c] = { tool: 'hlink' };
    g[0][5] = { tool: 'sounder', param: L('Groupe 1', 'Group 1') };
    g = blocks[2].grid;
    g[0][0] = { tool: 'fault', param: 'Z006' }; g[0][1] = { tool: 'flash' };
    for (let c = 2; c < 5; c++) g[0][c] = { tool: 'hlink' };
    g[0][5] = { tool: 'message', param: 'Message 3' };
    return blocks;
  }
  function sampleProject() {
    const r = rng(2026);
    const zones = L(['Passerelle', 'Salle des machines', 'Cabines bâbord', 'Cabines tribord', 'Cuisine', 'Salon passagers', 'Atelier', 'Cale avant'], ['Bridge', 'Engine room', 'Port cabins', 'Starboard cabins', 'Galley', 'Passenger lounge', 'Workshop', 'Forward hold'])
      .map((name, i) => ({ id: i + 1, name }));
    const a = newCpu(0, 2, 2, 1);
    const b = newCpu(1, 1, 1, 0);
    seedLoop(a, 0, 'A', 22, r, [1, 3, 4]);
    seedLoop(a, 0, 'B', 16, r, [2, 7]);
    seedLoop(a, 0, 'C', 9, r, [5]);
    seedLoop(a, 0, 'D', 6, r, [6]);
    seedLoop(b, 1, 'A', 14, r, [2, 8]);
    seedLoop(b, 1, 'B', 11, r, [6, 8]);
    return { ship: { name: 'MV DEMONSTRATOR', imo: '1234567', owner: L('Armement Exemple', 'Example Shipping'), email: L('bureau@exemple.invalid', 'office@example.invalid') }, zones, users: 3, cpus: [a, b, null, null], blocks: sampleBlocks() };
  }
  state.project = sampleProject();

  const P = () => state.project;
  const present = () => P().cpus.map((c, pos) => (c ? { c, pos } : null)).filter(Boolean);
  const loopsOf = (cpu) => LETTERS.slice(0, cpu.lm * 2);
  const cpuDevices = (cpu) => LETTERS.reduce((s, l) => s + cpu.loops[l].length, 0);
  const totalDevices = () => present().reduce((s, { c }) => s + cpuDevices(c), 0);
  const totalHmis = () => present().reduce((s, { c }) => s + c.hmi, 0);
  const loopCurrent = (devs) => devs.reduce((acc, d) => ({ sb: acc.sb + TYPES[d.type].sb, al: acc.al + TYPES[d.type].al }), { sb: 0, al: 0 });

  function imoValid(imo) {
    if (!/^\d{7}$/.test(imo)) return false;
    const sum = [7, 6, 5, 4, 3, 2].reduce((s, w, i) => s + w * Number(imo[i]), 0);
    return sum % 10 === Number(imo[6]);
  }
  const IMO_ERROR = L('Chiffre de contrôle IMO incorrect.', 'Incorrect IMO check digit.');

  /* Contrôle global de la configuration : une seule source pour l'écran et l'export. */
  function runChecks() {
    const p = P();
    const out = [];
    const push = (level, text) => out.push({ level, text });
    if (!p.ship.name.trim()) push('error', L('Le nom du navire est vide.', 'The ship name is empty.'));
    if (!imoValid(p.ship.imo)) push('error', L(`Le numéro IMO « ${p.ship.imo} » est invalide (7 chiffres et chiffre de contrôle).`, `IMO number "${p.ship.imo}" is invalid (7 digits with a check digit).`));
    if (p.ship.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.ship.email)) push('error', L('L’adresse e-mail de l’ingénieur est mal formée.', 'The engineer’s e-mail address is malformed.'));
    if (!present().length) push('error', L('L’installation ne contient aucune carte CPU.', 'The installation has no CPU board.'));
    if (!totalHmis()) push('error', L('L’installation doit comporter au moins un écran.', 'The installation needs at least one HMI.'));
    const usedZones = new Set();
    for (const { c, pos } of present()) {
      for (const l of loopsOf(c)) {
        const names = new Map();
        c.loops[l].forEach((d) => {
          usedZones.add(d.zone);
          if (!d.zone) push('error', L(`Point ${devAddr(pos, l, d.pt)} : aucune zone n’est affectée.`, `Point ${devAddr(pos, l, d.pt)}: no zone assigned.`));
          if (!d.name.trim()) push('error', L(`Point ${devAddr(pos, l, d.pt)} : le nom est vide.`, `Point ${devAddr(pos, l, d.pt)}: the name is empty.`));
          names.set(d.name, (names.get(d.name) || 0) + 1);
        });
        names.forEach((n, name) => { if (n > 1 && name.trim()) push('error', L(`CPU @${pos + 1}, boucle ${l} : le nom « ${name} » est utilisé ${n} fois.`, `CPU @${pos + 1}, loop ${l}: the name "${name}" is used ${n} times.`)); });
        if (!c.loops[l].length) push('warn', L(`CPU @${pos + 1}, boucle ${l} : la boucle est vide.`, `CPU @${pos + 1}, loop ${l}: the loop is empty.`));
        const cur = loopCurrent(c.loops[l]);
        if (cur.al > LIMITS.loopMa) push('advisory', L(`CPU @${pos + 1}, boucle ${l} : ${nf(cur.al, 1)} mA en alarme, au-dessus du plafond de ${LIMITS.loopMa} mA.`, `CPU @${pos + 1}, loop ${l}: ${nf(cur.al, 1)} mA in alarm, above the ${LIMITS.loopMa} mA limit.`));
      }
    }
    p.zones.forEach((z) => { if (!usedZones.has(z.id)) push('warn', L(`La zone Z${pad(z.id, 3)} « ${z.name} » n’a aucun détecteur.`, `Zone Z${pad(z.id, 3)} "${z.name}" has no device.`)); });
    const outputs = new Map();
    p.blocks.forEach((b) => {
      CE.issues(b.grid).forEach((i) => push('error', L(`Bloc « ${b.name} » : ${i}.`, `Block "${b.name}": ${i}.`)));
      b.grid.flat().forEach((cell) => {
        if (cell && cell.tool === 'output' && cell.param) {
          if (outputs.has(cell.param)) push('error', L(`La sortie ${cell.param} est affectée dans « ${outputs.get(cell.param)} » et « ${b.name} ».`, `Output ${cell.param} is assigned in both "${outputs.get(cell.param)}" and "${b.name}".`));
          else outputs.set(cell.param, b.name);
        }
      });
    });
    return out;
  }

  /* ---------- Rendu de la topologie ---------- */
  const GEO = {
    cpuX: [340, 670, 670, 340], cpuY: [90, 90, 400, 400], cpuW: 170, cpuH: 170,
  };
  function closeBtn(x, y, act, pos) {
    return `<g class="t-x" data-act="${act}" data-pos="${pos}" role="button" aria-label="${L('Retirer', 'Remove')}"><circle cx="${x}" cy="${y}" r="9"/><path d="M${x - 4} ${y - 4}l8 8m0-8l-8 8"/></g>`;
  }
  function freeSlot(x, y, w, h, act, pos, label) {
    return `<g data-act="${act}" data-pos="${pos}" role="button" aria-label="${esc(label)}"><rect class="t-slot" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text class="t-plus" x="${x + w / 2}" y="${y + h / 2 + 5}">+</text></g>`;
  }
  function stationSvg(pos) {
    const cpu = P().cpus[pos];
    const x = GEO.cpuX[pos];
    const y = GEO.cpuY[pos];
    const left = pos === 0 || pos === 3;
    const top = pos < 2;
    if (!cpu) {
      return `<g data-act="add-cpu" data-pos="${pos}" data-drop="${pos}" role="button" aria-label="${L(`Ajouter une CPU en position ${pos + 1}`, `Add a CPU at position ${pos + 1}`)}"><rect class="t-slot" x="${x}" y="${y}" width="${GEO.cpuW}" height="${GEO.cpuH}" rx="10"/><text class="t-plus" x="${x + GEO.cpuW / 2}" y="${y + GEO.cpuH / 2}">+ CPU</text><text class="t-plus" style="font-size:12px" x="${x + GEO.cpuW / 2}" y="${y + GEO.cpuH / 2 + 18}">@${pos + 1}</text></g>`;
    }
    let s = '';
    const modX = left ? x - 216 : x + GEO.cpuW + 8;
    /* Écrans */
    const hmiY = top ? y - 62 : y + GEO.cpuH + 8;
    for (let i = 0; i < 3; i++) {
      const hx = x + i * 59 - 3;
      if (i < cpu.hmi) {
        s += `<rect class="t-hmi" x="${hx}" y="${hmiY}" width="54" height="54" rx="6"/><text class="t-text" x="${hx + 27}" y="${hmiY + 24}">HMI${i + 1}</text><text class="t-small" text-anchor="middle" x="${hx + 27}" y="${hmiY + 40}">${esc(cpu.name)}</text>`;
        if (i === cpu.hmi - 1) s += closeBtn(hx + 45, hmiY + 10, 'del-hmi', pos);
      } else if (i === cpu.hmi) s += freeSlot(hx, hmiY, 54, 54, 'add-hmi', pos, L('Ajouter un écran', 'Add an HMI'));
    }
    /* Modules de boucles */
    for (let i = 0; i < 3; i++) {
      const my = y + i * 59;
      if (i < cpu.lm) {
        s += `<rect class="t-lm" x="${modX}" y="${my}" width="56" height="52" rx="6"/><text class="t-text" x="${modX + 26}" y="${my + 24}">LM${i + 1}</text><text class="t-small" text-anchor="middle" x="${modX + 26}" y="${my + 40}">${pad(pos + 1)}</text>`;
        if (i === cpu.lm - 1 && cpu.lm > 0) s += closeBtn(modX + 47, my + 10, 'del-lm', pos);
        LETTERS.slice(i * 2, i * 2 + 2).forEach((l, j) => {
          const lx = modX + 60 + j * 76;
          const over = loopCurrent(cpu.loops[l]).al > LIMITS.loopMa;
          s += `<g data-act="open-loop" data-pos="${pos}" data-letter="${l}" role="button" aria-label="${L(`Ouvrir la boucle ${l}`, `Open loop ${l}`)}"><rect class="t-loop ${over ? 'over' : ''}" x="${lx}" y="${my}" width="72" height="52" rx="4"/><text class="t-text" x="${lx + 36}" y="${my + 23}">${L('Boucle', 'Loop')} ${l}</text><text class="t-small" text-anchor="middle" x="${lx + 36}" y="${my + 39}">${cpu.loops[l].length} pts</text></g>`;
        });
      } else if (i === cpu.lm) s += freeSlot(modX, my, 56, 52, 'add-lm', pos, L('Ajouter un module de boucles', 'Add a loop module'));
    }
    /* Modules d'entrées/sorties */
    const ioY = top ? y - 62 : y + GEO.cpuH + 8;
    for (let i = 0; i < 2; i++) {
      const ix = modX + i * 106;
      if (i < cpu.io) {
        s += `<rect class="t-io" x="${ix}" y="${ioY}" width="102" height="54" rx="6"/><text class="t-text" x="${ix + 51}" y="${ioY + 32}">${L('E/S', 'I/O')} ${i + 1}</text>`;
        if (i === cpu.io - 1) s += closeBtn(ix + 92, ioY + 10, 'del-io', pos);
      } else if (i === cpu.io) s += freeSlot(ix, ioY, 102, 54, 'add-io', pos, L('Ajouter un module d’entrées/sorties', 'Add an I/O module'));
    }
    /* Carte CPU, déplaçable */
    s += `<g data-drag="${pos}" data-drop="${pos}">
      <rect class="t-cpu" x="${x}" y="${y}" width="${GEO.cpuW}" height="${GEO.cpuH}" rx="10"/>
      <text class="t-addr" x="${x + 12}" y="${y + 24}">@${pos + 1}</text>
      <text class="t-text strong" x="${x + GEO.cpuW / 2}" y="${y + 78}">${esc(cpu.name)}</text>
      <text class="t-small" x="${x + 12}" y="${y + 138}">${L('Détecteurs', 'Devices')} ${cpuDevices(cpu)}</text>
      <text class="t-small" x="${x + 12}" y="${y + 155}">${L('Glisser pour échanger', 'Drag to swap')}</text>
    </g>${closeBtn(x + GEO.cpuW - 16, y + 16, 'del-cpu', pos)}`;
    return s;
  }
  function netLines() {
    const pts = present().map(({ pos }) => pos);
    if (pts.length < 2) return '';
    const centre = (p) => [GEO.cpuX[p] + GEO.cpuW / 2, GEO.cpuY[p] + GEO.cpuH / 2];
    const edge = (p, dx, dy) => {
      const k = Math.min((GEO.cpuW / 2) / Math.abs(dx || 1e-6), (GEO.cpuH / 2) / Math.abs(dy || 1e-6));
      const [cx, cy] = centre(p);
      return [cx + dx * k, cy + dy * k];
    };
    let s = '';
    const n = pts.length === 2 ? 1 : pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const [ax, ay] = centre(a);
      const [bx, by] = centre(b);
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const [ex, ey] = edge(a, dx, dy);
      const [fx, fy] = edge(b, -dx, -dy);
      s += `<line class="t-net" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`;
      s += `<text class="t-netlabel" text-anchor="middle" x="${ex + ux * 26 - uy * 13}" y="${ey + uy * 26 + ux * 13 + 3}">NET1</text>`;
      s += `<text class="t-netlabel" text-anchor="middle" x="${fx - ux * 26 - uy * 13}" y="${fy - uy * 26 + ux * 13 + 3}">NET2</text>`;
    }
    return s;
  }
  function topoSvg() {
    return `<div class="topo-wrap"><svg class="topo" id="topo" viewBox="110 16 960 616" role="group" aria-label="${L('Topologie de l’installation', 'Installation topology')}">
      ${netLines()}${[0, 1, 2, 3].map(stationSvg).join('')}</svg></div>
      <div class="legend">
        <span><i style="background:var(--cpu);border-color:var(--cpu-line)"></i>CPU</span>
        <span><i style="background:var(--hmi);border-color:var(--hmi-line)"></i>${L('Écran', 'HMI')}</span>
        <span><i style="background:var(--lm);border-color:var(--lm-line)"></i>${L('Module de boucles', 'Loop module')}</span>
        <span><i style="background:var(--io);border-color:var(--io-line)"></i>${L('Module E/S', 'I/O module')}</span>
        <span><i style="border-color:var(--line);border-style:dashed"></i>${L('Emplacement libre', 'Free slot')}</span>
      </div>`;
  }
  function countersHtml() {
    const cs = present();
    const loops = cs.reduce((s, { c }) => s + loopsOf(c).length, 0);
    const ios = cs.reduce((s, { c }) => s + c.io, 0);
    const items = [['CPU', cs.length], [L('Écrans', 'HMIs'), totalHmis()], [L('Boucles', 'Loops'), loops], [L('Modules E/S', 'I/O modules'), ios], [L('Détecteurs', 'Devices'), totalDevices()], ['Zones', P().zones.length], [L('Blocs C&E', 'C&E blocks'), P().blocks.length], [L('Utilisateurs', 'Users'), P().users]];
    return items.map(([k, v]) => `<span>${k}${L(' :', ':')} <b>${v}</b></span>`).join('');
  }

  function topoAction(act, pos, letter) {
    const p = P();
    const cpu = p.cpus[pos];
    const refuse = (m) => toast(m, 'bad');
    switch (act) {
      case 'add-cpu': p.cpus[pos] = newCpu(pos, 0, 1, 0); toast(L(`CPU @${pos + 1} ajoutée. Les liaisons réseau se sont adaptées.`, `CPU @${pos + 1} added. The network links have adapted.`)); break;
      case 'del-cpu': {
        if (present().length === 1) return refuse(L('Refusé : une installation garde au moins une CPU.', 'Refused: an installation keeps at least one CPU.'));
        if (cpuDevices(cpu) && !confirm(L(`Supprimer ${cpu.name} et ses ${cpuDevices(cpu)} détecteurs ?`, `Delete ${cpu.name} and its ${cpuDevices(cpu)} devices?`))) return undefined;
        p.cpus[pos] = null;
        break;
      }
      case 'add-hmi':
        if (totalHmis() >= LIMITS.hmisTotal) return refuse(L(`Refusé : ${LIMITS.hmisTotal} écrans au maximum sur l’installation.`, `Refused: ${LIMITS.hmisTotal} HMIs at most on the installation.`));
        cpu.hmi += 1; break;
      case 'del-hmi':
        if (totalHmis() === 1) return refuse(L('Refusé : l’installation garde au moins un écran.', 'Refused: the installation keeps at least one HMI.'));
        cpu.hmi -= 1; break;
      case 'add-lm': cpu.lm += 1; break;
      case 'del-lm': {
        const ls = LETTERS.slice((cpu.lm - 1) * 2, cpu.lm * 2);
        const n = ls.reduce((s, l) => s + cpu.loops[l].length, 0);
        if (n && !confirm(L(`Ce module porte ${n} détecteurs. Les supprimer ?`, `This module carries ${n} devices. Delete them?`))) return undefined;
        ls.forEach((l) => { cpu.loops[l] = []; });
        cpu.lm -= 1;
        break;
      }
      case 'add-io': cpu.io += 1; break;
      case 'del-io': cpu.io -= 1; break;
      case 'open-loop': state.loop = { pos, letter }; state.sel.clear(); setTab('devices'); return undefined;
      default: return undefined;
    }
    render();
    return undefined;
  }
  function swapCpus(a, b) {
    const p = P();
    [p.cpus[a], p.cpus[b]] = [p.cpus[b], p.cpus[a]];
    [a, b].forEach((pos) => {
      const c = p.cpus[pos];
      if (!c) return;
      c.name = `CPU${pad(pos + 1)}`;
      LETTERS.forEach((l) => c.loops[l].forEach((d) => { if (/^P\d{2}[A-F]\d{3}$/.test(d.name)) d.name = devName(pos, l, d.pt); }));
    });
    toast(L(`Positions @${a + 1} et @${b + 1} échangées : les adresses des points suivent.`, `Positions @${a + 1} and @${b + 1} swapped: the point addresses follow.`));
    render();
  }

  function renderTopo(root) {
    const s = P().ship;
    root.innerHTML = `<div class="fox-layout">
      <aside class="card stack" style="gap:10px">
        <h3>${L('Projet', 'Project')}</h3>
        <label class="field">${L('Navire', 'Ship')}<input data-ship="name" value="${esc(s.name)}"></label>
        <label class="field">${L('N° IMO', 'IMO number')}<input data-ship="imo" class="${imoValid(s.imo) ? '' : 'invalid'}" value="${esc(s.imo)}" inputmode="numeric" maxlength="7">
          <span class="field-error" id="imo-err">${imoValid(s.imo) ? '' : IMO_ERROR}</span></label>
        <label class="field">${L('Armateur', 'Owner')}<input data-ship="owner" value="${esc(s.owner)}"></label>
        <label class="field">${L('E-mail ingénieur', 'Engineer e-mail')}<input data-ship="email" value="${esc(s.email)}"></label>
        <button class="btn" data-global="reset">${L('Recharger l’exemple', 'Reload the example')}</button>
      </aside>
      <div>
        ${topoSvg()}
        <p class="note" style="text-align:center;margin-top:6px">${L('Cliquez sur « + » pour ajouter une carte, sur une boucle pour l’éditer. Glissez une CPU sur une autre pour échanger leurs positions.', 'Click "+" to add a board, or a loop to edit it. Drag a CPU onto another one to swap their positions.')}</p>
      </div>
    </div>`;
    $$('[data-ship]', root).forEach((inp) => inp.addEventListener('input', () => {
      s[inp.dataset.ship] = inp.value;
      if (inp.dataset.ship === 'imo') {
        const ok = imoValid(inp.value);
        inp.classList.toggle('invalid', !ok);
        $('#imo-err').textContent = ok ? '' : IMO_ERROR;
      }
    }));
    const svg = $('#topo', root);
    svg.addEventListener('click', (e) => {
      if (svg.dataset.dragged) { delete svg.dataset.dragged; return; }
      const t = e.target.closest('[data-act]');
      if (t) topoAction(t.dataset.act, Number(t.dataset.pos), t.dataset.letter);
    });
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest('[data-drag]');
      if (!g) return;
      drag = { g, pos: Number(g.dataset.drag), x: e.clientX, y: e.clientY, moved: false, scale: svg.viewBox.baseVal.width / svg.getBoundingClientRect().width };
      g.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      drag.g.setAttribute('transform', `translate(${dx * drag.scale} ${dy * drag.scale})`);
      drag.g.style.pointerEvents = 'none';
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      svg.dataset.dragged = '1';
      d.g.removeAttribute('transform');
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * d.scale + 110;
      const py = (e.clientY - r.top) * d.scale + 16;
      const target = [0, 1, 2, 3].find((p) => px >= GEO.cpuX[p] && px <= GEO.cpuX[p] + GEO.cpuW && py >= GEO.cpuY[p] && py <= GEO.cpuY[p] + GEO.cpuH);
      d.g.style.pointerEvents = '';
      if (target !== undefined && target !== d.pos) swapCpus(d.pos, target);
      setTimeout(() => { delete svg.dataset.dragged; }, 0);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }

  /* ---------- Détecteurs ---------- */
  function currentLoop() {
    let { pos, letter } = state.loop;
    let cpu = P().cpus[pos];
    if (!cpu || !loopsOf(cpu).includes(letter)) {
      const first = present().find(({ c }) => loopsOf(c).length);
      if (!first) return null;
      pos = first.pos; cpu = first.c; letter = loopsOf(cpu)[0];
      state.loop = { pos, letter };
    }
    return { cpu, pos, letter, devs: cpu.loops[letter] };
  }
  function deviceRows(l) {
    const zones = P().zones;
    const dupes = new Map();
    l.devs.forEach((d) => dupes.set(d.name, (dupes.get(d.name) || 0) + 1));
    return l.devs.map((d) => `<tr class="clickable ${state.sel.has(d.pt) ? 'sel' : ''}" data-pt="${d.pt}">
      <td class="mono">${devAddr(l.pos, l.letter, d.pt)}</td>
      <td><input data-f="name" value="${esc(d.name)}" aria-label="${L('Nom', 'Name')}" class="${dupes.get(d.name) > 1 || !d.name.trim() ? 'invalid' : ''}" title="${dupes.get(d.name) > 1 ? L('Nom déjà utilisé dans cette boucle', 'Name already used in this loop') : ''}"></td>
      <td><select data-f="type" aria-label="Type">${Object.entries(TYPES).map(([k, t]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${t.label}</option>`).join('')}</select></td>
      <td><select data-f="mode" aria-label="Mode">${[1, 2, 3, 4, 5].map((m) => `<option ${m === d.mode ? 'selected' : ''}>${m}</option>`).join('')}</select></td>
      <td><select data-f="zone" aria-label="Zone" class="${d.zone ? '' : 'invalid'}"><option value="">${L('Aucune', 'None')}</option>${zones.map((z) => `<option value="${z.id}" ${z.id === d.zone ? 'selected' : ''}>Z${pad(z.id, 3)} · ${esc(z.name)}</option>`).join('')}</select></td>
      <td>${TYPES[d.type].sounder ? `<select data-f="vol" aria-label="Volume">${VOLUMES.map((v, i) => `<option value="${i}" ${i === d.vol ? 'selected' : ''}>${v}</option>`).join('')}</select>` : '<span class="muted">–</span>'}</td>
    </tr>`).join('');
  }
  function freePoints(devs, from = 1) {
    const used = new Set(devs.map((d) => d.pt));
    const free = [];
    for (let i = 1; i <= LIMITS.perLoop; i++) if (!used.has(i)) free.push(i);
    return [...free.filter((f) => f >= from), ...free.filter((f) => f < from)];
  }
  function guard(l, n) {
    if (l.devs.length + n > LIMITS.perLoop) {
      toast(L(`Refusé : ${n} point(s) de plus dépasseraient ${LIMITS.perLoop} détecteurs par boucle. Rien n’a été tronqué.`, `Refused: ${n} more point(s) would exceed ${LIMITS.perLoop} devices per loop. Nothing was truncated.`), 'bad');
      return false;
    }
    if (cpuDevices(l.cpu) + n > LIMITS.perStation) {
      toast(L(`Refusé : ${n} point(s) de plus dépasseraient ${LIMITS.perStation} détecteurs par station (EN 54-2). Rien n’a été tronqué.`, `Refused: ${n} more point(s) would exceed ${LIMITS.perStation} devices per station (EN 54-2). Nothing was truncated.`), 'bad');
      return false;
    }
    return true;
  }
  function insertDevices(l, items) {
    const from = state.sel.size ? Math.max(...state.sel) + 1 : 1;
    const free = freePoints(l.devs, from);
    const names = new Set(l.devs.map((d) => d.name));
    const fresh = items.map((item, i) => {
      const pt = free[i];
      let name = /^P\d{2}[A-F]\d{3}$/.test(item.name) ? devName(l.pos, l.letter, pt) : item.name;
      while (names.has(name)) name += L(' bis', ' copy');
      names.add(name);
      return { ...item, pt, name };
    });
    l.devs.push(...fresh);
    l.devs.sort((a, b) => a.pt - b.pt);
    state.sel = new Set(fresh.map((d) => d.pt));
    return fresh.length;
  }
  function deviceAction(act) {
    const l = currentLoop();
    if (!l) return;
    const selected = () => l.devs.filter((d) => state.sel.has(d.pt));
    const NEED_SEL = L('Sélectionnez d’abord au moins un point.', 'Select at least one point first.');
    switch (act) {
      case 'add':
        if (!guard(l, 1)) return;
        insertDevices(l, [{ name: 'P00A000', type: 'OPT', mode: 3, zone: P().zones[0]?.id || null, vol: null }]);
        break;
      case 'dup':
        if (!state.sel.size) { toast(NEED_SEL); return; }
        if (!guard(l, state.sel.size)) return;
        insertDevices(l, selected().map((d) => ({ ...d })));
        break;
      case 'copy': case 'cut':
        if (!state.sel.size) { toast(NEED_SEL); return; }
        state.clip = selected().map((d) => ({ ...d }));
        if (act === 'cut') {
          const cut = new Set(state.sel);
          l.cpu.loops[l.letter] = l.devs.filter((d) => !cut.has(d.pt));
          state.sel.clear();
        }
        toast(act === 'cut'
          ? L(`${state.clip.length} point(s) coupé(s). Vous pouvez les coller dans une autre boucle.`, `${state.clip.length} point(s) cut. You can paste them into another loop.`)
          : L(`${state.clip.length} point(s) copié(s). Vous pouvez les coller dans une autre boucle.`, `${state.clip.length} point(s) copied. You can paste them into another loop.`));
        break;
      case 'paste':
        if (!state.clip.length) { toast(L('Le presse-papiers de la démo est vide.', 'The demo clipboard is empty.')); return; }
        if (!guard(l, state.clip.length)) return;
        { const n = insertDevices(l, state.clip); toast(L(`${n} point(s) collé(s) et ré-adressé(s).`, `${n} point(s) pasted and re-addressed.`), 'ok'); }
        break;
      case 'del': {
        const del = new Set(state.sel);
        l.cpu.loops[l.letter] = l.devs.filter((d) => !del.has(d.pt));
        state.sel.clear();
        break;
      }
      case 'fill': {
        const n = LIMITS.perLoop - l.devs.length;
        if (!n) { toast(L(`La boucle contient déjà ${LIMITS.perLoop} points.`, `The loop already holds ${LIMITS.perLoop} points.`)); return; }
        if (!guard(l, n)) return;
        const r = rng(l.devs.length + 7);
        const before = state.sel;
        state.sel = new Set();
        insertDevices(l, Array.from({ length: n }, () => ({ name: 'P00A000', type: r.pick(['OPT', 'OPT', 'HEAT', 'MCP']), mode: 3, zone: P().zones[0]?.id || null, vol: null })));
        state.sel = before;
        toast(L(`${n} points ajoutés. La boucle est pleine.`, `${n} points added. The loop is full.`));
        break;
      }
      default: return;
    }
    render();
  }
  function renderDevices(root) {
    const l = currentLoop();
    if (!l) { root.innerHTML = `<div class="card">${L('Ajoutez d’abord une CPU et un module de boucles.', 'Add a CPU and a loop module first.')}</div>`; return; }
    const options = present().flatMap(({ c, pos }) => loopsOf(c).map((letter) => `<option value="${pos}:${letter}" ${pos === l.pos && letter === l.letter ? 'selected' : ''}>CPU @${pos + 1} · ${L('Boucle', 'Loop')} ${letter} (${c.loops[letter].length})</option>`)).join('');
    root.innerHTML = `
      <div class="dev-toolbar">
        <select id="loop-select" aria-label="${L('Boucle', 'Loop')}">${options}</select>
        <button class="btn" data-dev="add">${L('Ajouter', 'Add')}</button>
        <button class="btn" data-dev="dup">${L('Dupliquer', 'Duplicate')}</button>
        <button class="btn" data-dev="copy">${L('Copier', 'Copy')}</button>
        <button class="btn" data-dev="cut">${L('Couper', 'Cut')}</button>
        <button class="btn" data-dev="paste">${L('Coller', 'Paste')}${state.clip.length ? ` (${state.clip.length})` : ''}</button>
        <button class="btn danger" data-dev="del" ${state.sel.size ? '' : 'disabled'}>${L('Supprimer', 'Delete')}</button>
        <span class="spacer"></span>
        <button class="btn" data-dev="fill" title="${L('Pour tester les gardes de capacité', 'To test the capacity guards')}">${L('Remplir la boucle', 'Fill the loop')}</button>
        <span class="pill ${l.devs.length >= LIMITS.perLoop ? 'warn' : 'ok'}">${l.devs.length} / ${LIMITS.perLoop} · station ${cpuDevices(l.cpu)} / ${LIMITS.perStation}</span>
      </div>
      <div class="table-wrap dev-table" tabindex="0" id="dev-table" aria-label="${L('Détecteurs de la boucle', 'Devices on the loop')}">
        <table class="data"><thead><tr><th>${L('Adresse', 'Address')}</th><th>${L('Nom', 'Name')}</th><th>Type</th><th>Mode</th><th>Zone</th><th>Volume</th></tr></thead>
        <tbody>${deviceRows(l)}</tbody></table>
      </div>
      <p class="note" style="margin-top:8px">${L('Sélection comme dans un tableur : clic, Ctrl+clic, Maj+clic, puis Ctrl+C, X, V, A et Suppr. Un collage trop grand pour la boucle ou la station est refusé en bloc, jamais tronqué.', 'Spreadsheet-style selection: click, Ctrl+click, Shift+click, then Ctrl+C, X, V, A and Delete. A paste too large for the loop or station is refused as a whole, never truncated.')}</p>`;
    $('#loop-select', root).addEventListener('change', (e) => {
      const [pos, letter] = e.target.value.split(':');
      state.loop = { pos: Number(pos), letter };
      state.sel.clear();
      render();
    });
    $$('[data-dev]', root).forEach((b) => b.addEventListener('click', () => deviceAction(b.dataset.dev)));
    const table = $('#dev-table', root);
    table.addEventListener('click', (e) => {
      if (e.target.closest('input,select')) return;
      const tr = e.target.closest('tr[data-pt]');
      if (!tr) return;
      const pt = Number(tr.dataset.pt);
      if (e.shiftKey && state.anchor != null) {
        const [a, b] = [Math.min(state.anchor, pt), Math.max(state.anchor, pt)];
        state.sel = new Set(l.devs.filter((d) => d.pt >= a && d.pt <= b).map((d) => d.pt));
      } else if (e.ctrlKey || e.metaKey) {
        if (state.sel.has(pt)) state.sel.delete(pt); else state.sel.add(pt);
        state.anchor = pt;
      } else {
        state.sel = new Set([pt]);
        state.anchor = pt;
      }
      const top = table.scrollTop;
      render();
      const t2 = $('#dev-table');
      if (t2) { t2.scrollTop = top; t2.focus(); }
    });
    table.addEventListener('change', (e) => {
      const f = e.target.dataset.f;
      if (!f) return;
      const pt = Number(e.target.closest('tr').dataset.pt);
      const d = l.devs.find((x) => x.pt === pt);
      if (f === 'name') d.name = e.target.value;
      if (f === 'type') { d.type = e.target.value; d.vol = TYPES[d.type].sounder ? (d.vol ?? 1) : null; }
      if (f === 'mode') d.mode = Number(e.target.value);
      if (f === 'zone') d.zone = e.target.value ? Number(e.target.value) : null;
      if (f === 'vol') d.vol = Number(e.target.value);
      const top = table.scrollTop;
      render();
      const t2 = $('#dev-table');
      if (t2) t2.scrollTop = top;
    });
    table.addEventListener('keydown', (e) => {
      if (e.target.closest('input,select')) return;
      const k = e.key.toLowerCase();
      const run = (act) => { e.preventDefault(); const top = table.scrollTop; deviceAction(act); const t2 = $('#dev-table'); if (t2) { t2.focus(); t2.scrollTop = top; } };
      if ((e.ctrlKey || e.metaKey) && k === 'c') run('copy');
      else if ((e.ctrlKey || e.metaKey) && k === 'x') run('cut');
      else if ((e.ctrlKey || e.metaKey) && k === 'v') run('paste');
      else if ((e.ctrlKey || e.metaKey) && k === 'a') { e.preventDefault(); state.sel = new Set(l.devs.map((d) => d.pt)); render(); $('#dev-table')?.focus(); }
      else if (k === 'delete') run('del');
    });
  }

  /* ---------- Cause & Effects ---------- */
  function placeTool(toolId, r, c) {
    const b = P().blocks[state.ce.block];
    const t = CE.TOOLS[toolId];
    if (t.kind === 'effect' && c !== CE.COLS - 1) { toast(L('Un effet se place dans la dernière colonne.', 'An effect goes in the last column.'), 'bad'); return false; }
    if (t.kind === 'cause' && c === CE.COLS - 1) { toast(L('Une cause ne peut pas occuper la dernière colonne.', 'A cause cannot go in the last column.'), 'bad'); return false; }
    if (t.kind === 'vlink' && r === CE.ROWS - 1) { toast(L('Une liaison verticale rejoint la ligne du dessous : impossible sur la dernière ligne.', 'A vertical link joins the row below: not possible on the last row.'), 'bad'); return false; }
    b.grid[r][c] = { tool: toolId, param: '' };
    if (t.needs) {
      const suggestions = { fire: 'Z001', fault: 'Z001', disable: 'Z001', tech: '01A001', nofire: 'Z001', timer: '10 s', sounder: L('Groupe 1', 'Group 1'), output: `PO_${pad(r + c + 2)}`, message: 'Message 1' };
      b.grid[r][c].param = suggestions[toolId] || '';
    }
    state.ce.cell = [r, c];
    return true;
  }
  function renderCe(root) {
    const ce = state.ce;
    const blocks = P().blocks;
    ce.block = clamp(ce.block, 0, blocks.length - 1);
    const b = blocks[ce.block];
    const { lit } = CE.evaluate(b.grid, (r, c) => Boolean(ce.active[`${ce.block}:${r},${c}`]));
    const groups = [...new Set(blocks.map((x) => x.group))];
    const selCell = ce.cell && b.grid[ce.cell[0]][ce.cell[1]];
    const blockIssues = CE.issues(b.grid);
    root.innerHTML = `<div class="ce-layout">
      <div class="card">
        <div class="btn-row" style="margin-bottom:8px">
          <button class="btn" data-ce="add-block">+ ${L('Bloc', 'Block')}</button>
          <button class="btn danger" data-ce="del-block" ${blocks.length < 2 ? 'disabled' : ''}>${L('Supprimer', 'Delete')}</button>
        </div>
        <div class="note" style="margin-bottom:4px">${blocks.length} / ${LIMITS.blocks} ${L('blocs', 'blocks')}</div>
        <div class="ce-tree">
          ${groups.map((g) => `<div class="grp">${esc(g)}</div>${blocks.map((x, i) => (x.group === g ? `<button class="${i === ce.block ? 'on' : ''}" data-block="${i}">${esc(x.name)}</button>` : '')).join('')}`).join('')}
        </div>
      </div>
      <div class="stack" style="min-width:0">
        <div class="btn-row">
          <input id="ce-name" value="${esc(b.name)}" aria-label="${L('Nom du bloc', 'Block name')}" style="flex:1;min-width:160px;font-weight:600">
          <button class="btn ${ce.sim ? 'on' : ''}" data-ce="sim" aria-pressed="${ce.sim}">${ce.sim ? L('Quitter le test', 'Exit test') : L('Tester la logique', 'Test the logic')}</button>
          ${blockIssues.length ? `<span class="pill bad">${blockIssues.length} ${L('à corriger', 'to fix')}</span>` : `<span class="pill ok">${L('Bloc cohérent', 'Block is consistent')}</span>`}
        </div>
        <p class="note" style="margin:0">${ce.sim ? L('Mode test, propre à la démo : cliquez sur une cause pour l’activer et suivre le courant jusqu’aux effets.', 'Test mode, specific to this demo: click a cause to activate it and follow the current through to the effects.') : L('Glissez un composant de la boîte à outils sur une case. Sur écran tactile, touchez le composant puis la case. Cliquez sur une case pour la paramétrer.', 'Drag a component from the toolbox onto a cell. On a touch screen, tap the component and then the cell. Click a cell to set its parameters.')}</p>
        <div class="ce-scroll" id="ce-grid">${CE.gridHtml(b.grid, { lit: ce.sim ? lit : null, selected: ce.sim ? null : ce.cell })}</div>
        ${!ce.sim && selCell ? `<div class="card btn-row">
          <strong style="font-size:13.5px">${esc(CE.TOOLS[selCell.tool].label)}</strong>
          ${CE.TOOLS[selCell.tool].needs ? `<label class="field" style="grid-auto-flow:column;align-items:center;gap:6px">${esc(CE.TOOLS[selCell.tool].needs)}<input id="ce-param" value="${esc(selCell.param)}"></label>` : ''}
          <span class="spacer"></span>
          <button class="btn danger" data-ce="clear-cell">${L('Effacer la case', 'Clear the cell')}</button>
        </div>` : ''}
        ${blockIssues.length ? `<p class="note" style="margin:0;color:var(--fire)">${blockIssues.map(esc).join(' · ')}</p>` : ''}
      </div>
      <div class="card toolbox" aria-label="${L('Boîte à outils', 'Toolbox')}">
        ${Object.entries(CE.GROUPS).map(([g, label]) => `<div><div class="tool-group">${label}</div><div class="tool-list">
          ${Object.entries(CE.TOOLS).filter(([, t]) => t.group === g).map(([id, t]) => `<button class="tool ${ce.tool === id ? 'on' : ''}" draggable="true" data-tool="${id}" aria-pressed="${ce.tool === id}"><svg viewBox="-16 -16 32 32" aria-hidden="true">${t.icon}</svg>${esc(t.label)}</button>`).join('')}
        </div></div>`).join('')}
      </div>
    </div>`;

    $$('[data-block]', root).forEach((x) => x.addEventListener('click', () => { ce.block = Number(x.dataset.block); ce.cell = null; render(); }));
    $('#ce-name', root).addEventListener('change', (e) => { b.name = e.target.value.trim() || b.name; render(); });
    const param = $('#ce-param', root);
    if (param) param.addEventListener('change', (e) => { selCell.param = e.target.value.trim(); render(); });
    $$('[data-ce]', root).forEach((x) => x.addEventListener('click', () => {
      const act = x.dataset.ce;
      if (act === 'sim') { ce.sim = !ce.sim; ce.cell = null; ce.tool = null; }
      if (act === 'add-block') {
        if (blocks.length >= LIMITS.blocks) { toast(L(`Refusé : ${LIMITS.blocks} blocs au maximum.`, `Refused: ${LIMITS.blocks} blocks at most.`), 'bad'); return; }
        blocks.push({ group: b.group, name: L(`Nouveau bloc ${blocks.length + 1}`, `New block ${blocks.length + 1}`), grid: CE.emptyGrid() });
        ce.block = blocks.length - 1; ce.cell = null;
      }
      if (act === 'del-block') { blocks.splice(ce.block, 1); ce.block = 0; ce.cell = null; }
      if (act === 'clear-cell' && ce.cell) { b.grid[ce.cell[0]][ce.cell[1]] = null; ce.cell = null; }
      render();
    }));
    $$('.tool', root).forEach((t) => {
      t.addEventListener('click', () => { ce.tool = ce.tool === t.dataset.tool ? null : t.dataset.tool; ce.sim = false; render(); });
      t.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', `tool:${t.dataset.tool}`); e.dataTransfer.effectAllowed = 'copy'; });
    });
    const grid = $('#ce-grid', root);
    $$('.ce-cell.used', grid).forEach((cell) => {
      if (!ce.sim) {
        cell.draggable = true;
        cell.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', `cell:${cell.dataset.r},${cell.dataset.c}`); });
      }
    });
    grid.addEventListener('dragover', (e) => { const c = e.target.closest('.ce-cell'); if (c) { e.preventDefault(); c.classList.add('drop'); } });
    grid.addEventListener('dragleave', (e) => { const c = e.target.closest('.ce-cell'); if (c) c.classList.remove('drop'); });
    grid.addEventListener('drop', (e) => {
      const c = e.target.closest('.ce-cell');
      if (!c) return;
      e.preventDefault();
      const r = Number(c.dataset.r);
      const col = Number(c.dataset.c);
      const data = e.dataTransfer.getData('text/plain');
      if (data.startsWith('tool:')) placeTool(data.slice(5), r, col);
      if (data.startsWith('cell:')) {
        const [fr, fc] = data.slice(5).split(',').map(Number);
        const moved = b.grid[fr][fc];
        if (moved && (fr !== r || fc !== col)) {
          const before = b.grid[r][col];
          b.grid[fr][fc] = null;
          if (placeTool(moved.tool, r, col)) b.grid[r][col].param = moved.param;
          else { b.grid[fr][fc] = moved; b.grid[r][col] = before; }
        }
      }
      render();
    });
    grid.addEventListener('click', (e) => {
      const c = e.target.closest('.ce-cell');
      if (!c) return;
      const r = Number(c.dataset.r);
      const col = Number(c.dataset.c);
      const cell = b.grid[r][col];
      if (ce.sim) {
        if (cell && CE.TOOLS[cell.tool].kind === 'cause') {
          const key = `${ce.block}:${r},${col}`;
          ce.active[key] = !ce.active[key];
          render();
        }
        return;
      }
      if (ce.tool) { placeTool(ce.tool, r, col); ce.tool = null; } else ce.cell = cell ? [r, col] : null;
      render();
    });
  }

  /* ---------- Courants ---------- */
  function renderCurrents(root) {
    const rows = present().flatMap(({ c, pos }) => loopsOf(c).map((l) => ({ pos, l, n: c.loops[l].length, ...loopCurrent(c.loops[l]) })));
    const tot = rows.reduce((a, r) => ({ sb: a.sb + r.sb, al: a.al + r.al }), { sb: 0, al: 0 });
    const over = rows.filter((r) => r.al > LIMITS.loopMa).length;
    root.innerHTML = `<div class="stack">
      <div class="kpis" style="margin:0">
        <div class="kpi"><b>${nf(tot.sb, 1)} mA</b><span>${L('Total au repos', 'Standby total')}</span></div>
        <div class="kpi"><b>${nf(tot.al, 1)} mA</b><span>${L('Total en alarme', 'Alarm total')}</span></div>
        <div class="kpi"><b>${over}</b><span>${L(`Boucle(s) au-dessus de ${LIMITS.loopMa} mA`, `Loop(s) above ${LIMITS.loopMa} mA`)}</span></div>
      </div>
      <div class="table-wrap"><table class="data"><thead><tr><th>${L('Boucle', 'Loop')}</th><th class="num">${L('Détecteurs', 'Devices')}</th><th class="num">${L('Repos', 'Standby')}</th><th>${L('Alarme, comparée au plafond', 'Alarm, compared with the limit')}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>CPU @${r.pos + 1} · ${r.l}</td><td class="num">${r.n}</td><td class="num">${nf(r.sb, 1)} mA</td>
        <td><span class="bar-mini"><i class="${r.al > LIMITS.loopMa ? 'over' : ''}" style="width:${clamp((r.al / LIMITS.loopMa) * 100, 0, 100)}%"></i></span><span class="${r.al > LIMITS.loopMa ? 'cell-bad' : ''}">${nf(r.al, 1)} mA${r.al > LIMITS.loopMa ? L(' · dépassement', ' · over limit') : ''}</span></td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin:0">${L('Le calcul additionne, par boucle, les consommations au repos et en alarme de chaque équipement. Il alerte sans bloquer l’export. Les consommations de cette démo sont fictives : passez de nombreux points en bases sirène-flash pour provoquer un dépassement.', 'For each loop, the calculation adds up the standby and alarm consumption of every device. It warns without blocking the export. The consumption values in this demo are fictional: try setting many devices to sounder-beacon bases to trigger an overload.')}</p>
    </div>`;
  }

  /* ---------- Contrôle et export ---------- */
  function renderChecks(root) {
    const checks = runChecks();
    const errors = checks.filter((c) => c.level === 'error');
    const warns = checks.filter((c) => c.level === 'warn');
    const advisories = checks.filter((c) => c.level === 'advisory');
    const pill = { error: ['bad', L('Erreur', 'Error')], warn: ['warn', L('Avertissement', 'Warning')], advisory: ['info', L('Indicatif', 'Advisory')] };
    const canSave = !errors.length;
    const canExport = !errors.length && !warns.length;
    root.innerHTML = `<div class="grid two">
      <div class="card">
        <h3>${L('Contrôle de la configuration', 'Configuration check')}</h3>
        <div class="btn-row" style="margin-bottom:10px">
          <span class="pill ${errors.length ? 'bad' : 'ok'}">${errors.length} ${L('erreur(s)', 'error(s)')}</span>
          <span class="pill ${warns.length ? 'warn' : 'ok'}">${warns.length} ${L('avertissement(s)', 'warning(s)')}</span>
          <span class="pill ${advisories.length ? 'info' : 'neutral'}">${advisories.length} ${L('indicatif(s)', 'advisory')}</span>
        </div>
        <div class="checklist">${checks.length ? checks.slice(0, 30).map((c) => `<div class="check-item"><span class="pill ${pill[c.level][0]}">${pill[c.level][1]}</span><span>${esc(c.text)}</span></div>`).join('') : `<p class="note" style="margin:0">${L('Aucun problème : la configuration peut être enregistrée et exportée.', 'No issues: the configuration can be saved and exported.')}</p>`}</div>
        ${checks.length > 30 ? `<p class="note">${L(`Et ${checks.length - 30} autre(s).`, `And ${checks.length - 30} more.`)}</p>` : ''}
      </div>
      <div class="stack">
        <div class="card">
          <h3>${L('Sorties', 'Outputs')}</h3>
          <p class="note">${L('Une erreur bloque l’enregistrement et l’export. Un avertissement ne bloque que l’export. Un indicatif ne bloque rien.', 'An error blocks saving and exporting. A warning only blocks exporting. An advisory blocks nothing.')}</p>
          <div class="btn-row">
            <button class="btn" data-out="save" ${canSave ? '' : 'disabled'}>${L('Enregistrer l’archive', 'Save the archive')}</button>
            <button class="btn primary" data-out="export" ${canExport ? '' : 'disabled'}>${L('Exporter le binaire DEMO', 'Export the DEMO binary')}</button>
          </div>
          <p class="note" style="margin:10px 0 0">${L('L’export produit un fichier au format inventé pour la démo, à ouvrir ensuite dans le visualiseur.', 'The export produces a file in a format made up for this demo, which then opens in the visualizer.')}</p>
        </div>
        <div class="card">
          <h3>${L('Provoquer des erreurs', 'Trigger errors')}</h3>
          <p class="note">${L('La configuration d’exemple est saine. Ces boutons la dégradent pour montrer le filet de sécurité.', 'The example configuration is valid. These buttons degrade it to show the safety net.')}</p>
          <div class="btn-row">
            <button class="btn" data-out="break">${L('Introduire des erreurs', 'Introduce errors')}</button>
            <button class="btn" data-global="reset">${L('Recharger l’exemple', 'Reload the example')}</button>
          </div>
        </div>
      </div>
    </div>`;
    $$('[data-out]', root).forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.out;
      if (act === 'save') {
        download(`${P().ship.name.replace(/\W+/g, '_')}.demo.json`, JSON.stringify(P(), null, 1), 'application/json');
        toast(L('Archive de démonstration enregistrée.', 'Demo archive saved.'), 'ok');
      }
      if (act === 'export') {
        App.shared.exportedBin = BinDemo.fromProject(P());
        toast(L('Binaire DEMO généré, ouverture du visualiseur.', 'DEMO binary generated, opening the visualizer.'), 'ok');
        location.hash = '#/binviz';
      }
      if (act === 'break') {
        const p = P();
        p.ship.imo = '1234568';
        const first = present()[0];
        if (first) {
          const l = loopsOf(first.c)[0];
          const d = first.c.loops[l];
          if (d.length > 1) { d[1].name = d[0].name; d[0].zone = null; }
        }
        p.zones.push({ id: p.zones.length + 1, name: L('Local sans détecteur', 'Room without a device') });
        render();
      }
    }));
  }

  /* ---------- Import d'une ancienne configuration ---------- */
  const LEGACY = {
    file: 'MV ATLANTIS rev. C',
    nodes: [
      [L('Panneau passerelle', 'Bridge panel'), 'CPU', '01', 'A · B', 64],
      [L('Panneau machine', 'Engine panel'), 'CPU', '02', 'A · B', 38],
      [L('Extension pont 3', 'Deck 3 extension'), L('Module de boucles', 'Loop module'), '01', 'C · D', 22],
      [L('Répétiteur coupée', 'Gangway repeater'), L('Ignoré', 'Ignored'), '–', '–', 0],
    ],
    decisions: [
      ['ok', L('Correspondance', 'Match'), L('118 détecteurs ont un équivalent direct.', '118 devices have a direct equivalent.')],
      ['ok', L('Correspondance', 'Match'), L('6 blocs de Cause & Effects convertis cellule par cellule.', '6 Cause & Effects blocks converted cell by cell.')],
      ['info', L('Repli tracé', 'Logged fallback'), L('Le paramètre de vitesse du port série n’existe plus : valeur par défaut appliquée et visible à l’écran.', 'The serial port speed setting no longer exists: the default value is applied and shown on screen.')],
      ['warn', L('Retiré', 'Removed'), L('Le réglage de bip clavier n’a pas d’équivalent : il disparaît et c’est écrit ici.', 'The keyboard beep setting has no equivalent: it goes away, and this report says so.')],
      ['neutral', 'Note', L('Les adresses imprimées à bord restent valables pour tous les points.', 'The addresses printed on board remain valid for every point.')],
    ],
    unknown: { code: 'X-17', count: 6 },
  };
  function renderImport(root) {
    const choice = state.imported.choice || '';
    root.innerHTML = `<div class="stack">
      <div class="card">
        <h3>${L('Import assisté : rien n’est écrit avant votre décision', 'Assisted import: nothing is written before you decide')}</h3>
        <p class="note">${L('Une ancienne configuration fictive, déjà décodée. La page montre ce que la conversion ferait et chaque choix qu’elle a pris. Chaque valeur reçoit un verdict : correspondance, repli tracé, ou refus quand un repli passerait inaperçu.', 'A fictional legacy configuration, already decoded. The page shows what the conversion would do and every choice it made. Each value gets a verdict: match, logged fallback, or refusal when a fallback would go unnoticed.')}</p>
        <div class="btn-row"><strong>${LEGACY.file}</strong><span class="note">${L('Navire fictif · 124 points · 6 blocs C&E · 5 zones', 'Fictional ship · 124 points · 6 C&E blocks · 5 zones')}</span></div>
      </div>
      <div class="grid two">
        <div class="card">
          <h3>${L('Où vont les boucles', 'Where the loops land')}</h3>
          <div class="table-wrap"><table class="data"><thead><tr><th>${L('Ancien nœud', 'Legacy node')}</th><th>${L('Devient', 'Becomes')}</th><th>CPU</th><th>${L('Boucles', 'Loops')}</th><th class="num">Points</th></tr></thead>
          <tbody>${LEGACY.nodes.map((n) => `<tr><td>${n[0]}</td><td>${n[1]}</td><td>${n[2]}</td><td>${n[3]}</td><td class="num">${n[4]}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <div class="card">
          <h3>${L('Ce que la conversion a décidé', 'What the conversion decided')}</h3>
          <div class="checklist">${LEGACY.decisions.map(([k, t, m]) => `<div class="check-item"><span class="pill ${k}">${t}</span><span>${m}</span></div>`).join('')}
            <div class="check-item"><span class="pill bad">${L('Refus', 'Refused')}</span><span>${L(`Le type « ${LEGACY.unknown.code} » est inconnu (${LEGACY.unknown.count} points). Il n’est jamais transformé d’office :`, `Type "${LEGACY.unknown.code}" is unknown (${LEGACY.unknown.count} points). It is never converted automatically:`)}
              <label class="field" style="margin-top:6px">${L('Que sont ces points ?', 'What are these points?')}
                <select id="imp-choice"><option value="">${L('À trancher', 'To be decided')}</option>${['OPT', 'HEAT', 'MULTI'].map((k) => `<option value="${k}" ${choice === k ? 'selected' : ''}>${TYPES[k].label}</option>`).join('')}</select></label></span></div>
          </div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="imp-go" ${choice ? '' : 'disabled'}>${L('Importer dans le projet', 'Import into the project')}</button>
        ${choice ? '' : `<span class="note">${L('Bouton actif une fois le type inconnu tranché.', 'The button becomes active once the unknown type is resolved.')}</span>`}
      </div>
    </div>`;
    $('#imp-choice', root).addEventListener('change', (e) => { state.imported.choice = e.target.value; render(); });
    $('#imp-go', root).addEventListener('click', () => {
      const r = rng(77);
      const zones = L(['Passerelle', 'Machine', 'Coupée', 'Cabines', 'Pont 3'], ['Bridge', 'Engine room', 'Gangway', 'Cabins', 'Deck 3']).map((name, i) => ({ id: i + 1, name }));
      const a = newCpu(0, 1, 2, 0);
      const b = newCpu(1, 1, 1, 0);
      seedLoop(a, 0, 'A', 34, r, [1, 3, 4]); seedLoop(a, 0, 'B', 30, r, [4, 1]);
      seedLoop(a, 0, 'C', 12, r, [5]); seedLoop(a, 0, 'D', 10, r, [5]);
      seedLoop(b, 1, 'A', 20, r, [2]); seedLoop(b, 1, 'B', 18, r, [2]);
      a.loops.A.slice(0, LEGACY.unknown.count).forEach((d) => { d.type = choice || state.imported.choice; d.vol = null; });
      state.project = { ship: { name: 'MV ATLANTIS', imo: '1234567', owner: L('Armement Exemple', 'Example Shipping'), email: '' }, zones, users: 3, cpus: [a, b, null, null], blocks: sampleBlocks() };
      state.project.blocks[0].grid[0][0].param = 'Z002'; state.project.blocks[0].grid[1][0].param = 'Z001';
      state.ce.block = 0; state.sel.clear(); state.imported = {};
      toast(L('Configuration convertie en mémoire : rien n’est enregistré tant que vous ne le demandez pas.', 'Configuration converted in memory: nothing is saved until you ask for it.'), 'ok');
      setTab('topo');
    });
  }

  function renderShots(root) {
    const shots = [
      ['topologie.png', L('La topologie du réseau, disposée dans l’espace. Installation de test poussée aux limites.', 'The network topology, laid out spatially. A test installation pushed to the limits.')],
      ['theme-sombre.png', L('L’application complète en thème sombre, commutable à chaud.', 'The full application in the dark theme, switchable on the fly.')],
      ['detecteurs.png', L('L’éditeur de détecteurs d’une boucle, avec sélection de type tableur.', 'The device editor for a loop, with spreadsheet-style selection.')],
      ['cause-effects.png', L('L’éditeur Cause & Effects : arbre de blocs, grille et boîte à outils.', 'The Cause & Effects editor: block tree, grid and toolbox.')],
      ['module-io.png', L('Le réglage voie par voie d’un module d’entrées/sorties.', 'Channel-by-channel setup of an I/O module.')],
    ];
    root.innerHTML = `<p class="note">${L('Captures de la vraie application WPF, sur des données de test synthétiques.', 'Screenshots of the real WPF application, with synthetic test data.')}</p>
      <div class="shot-grid">${shots.map(([f, c]) => `<figure class="shot"><a href="assets/img/${f}" target="_blank" rel="noopener"><img src="assets/img/${f}" alt="${esc(c)}" loading="lazy"></a><figcaption>${esc(c)}</figcaption></figure>`).join('')}</div>`;
  }

  /* ---------- Page ---------- */
  const TABS = [
    { id: 'topo', label: 'Configuration' }, { id: 'devices', label: L('Détecteurs', 'Devices') }, { id: 'ce', label: 'Cause & Effects' },
    { id: 'current', label: L('Courants', 'Currents') }, { id: 'check', label: L('Contrôle & export', 'Check & export') }, { id: 'import', label: 'Import' }, { id: 'shots', label: L('Vraies captures', 'Real screenshots') },
  ];
  let host = null;
  function render() {
    if (!host) return;
    $('#fox-tabs', host).innerHTML = tabsHtml(TABS, state.tab);
    $('#fox-counters', host).innerHTML = countersHtml();
    const body = $('#fox-body', host);
    ({ topo: renderTopo, devices: renderDevices, ce: renderCe, current: renderCurrents, check: renderChecks, import: renderImport, shots: renderShots })[state.tab](body);
    $$('[data-global="reset"]', body).forEach((b) => b.addEventListener('click', () => {
      state.project = sampleProject();
      state.sel.clear(); state.ce.block = 0; state.ce.cell = null; state.ce.active = {};
      render();
      toast(L('Configuration d’exemple rechargée.', 'Example configuration reloaded.'));
    }));
  }
  function setTab(id) { state.tab = id; render(); }

  App.pages.foxsoft = {
    title: 'FOX_Soft',
    mount(el) {
      el.innerHTML = `<header class="page-head">
        <div class="kicker">${L('Projet principal', 'Main project')} · C#, .NET, WPF, MVVM · ${nf(1255)} tests</div>
        <h1>FOX_Soft</h1>
        <p>${L('Une centrale incendie ne vaut que si l’installateur peut la configurer précisément pour chaque navire. FOX_Soft décrit l’installation, empêche activement les incohérences, archive le projet et génère le fichier chargé dans la centrale.', 'A fire-detection panel is only worth something if the installer can configure it precisely for each ship. FOX_Soft describes the installation, actively prevents inconsistencies, archives the project and generates the file loaded into the panel.')}</p>
      </header>
      ${simBanner(L('Une version réduite, réécrite pour le navigateur, sur un navire fictif. Elle ne produit aucun fichier compatible avec une vraie centrale.', 'A reduced version, rewritten for the browser, on a fictional ship. It produces no file compatible with a real panel.'))}
      <div id="fox-tabs"></div>
      <div class="counters" id="fox-counters"></div>
      <div id="fox-body"></div>`;
      host = el;
      $('#fox-tabs', el).addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) setTab(t.dataset.tab); });
      render();
    },
    unmount() { host = null; },
  };

  return { state };
})();
