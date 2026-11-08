/* FoxFrameGenerator, version simulée : forge et décodage de trames sur une liaison
   virtuelle. Enveloppe et événements sont fictifs ; seul Modbus RTU suit un
   standard public. */
'use strict';

(() => {
  const OBJECTS = { 1: 'Point', 2: 'Zone', 3: L('Système', 'System') };
  const CODES = { 1: L('feu', 'fire'), 2: L('feu acquitté', 'fire acknowledged'), 3: L('défaut', 'fault'), 4: L('défaut levé', 'fault cleared'), 5: L('hors service', 'disabled'), 6: L('remise en service', 're-enabled') };
  const LOOP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const LOOP_WORD = L('Boucle', 'Loop');
  const TYPE_EVENT = 0x0101;
  const TYPE_ALIVE = 0x0102;
  const TYPE_NAMES = { [TYPE_EVENT]: 'EVENT', [TYPE_ALIVE]: 'ALIVE' };
  const SOURCE_COLORS = ['var(--series-1)', 'var(--series-3)', 'var(--series-2)'];

  const state = {
    cfg: { header: 'A5', footer: '5A', lenWidth: 2, check: 'CRC-16/CCITT-FALSE', src: 1, dst: 2 },
    ev: { obj: 1, code: 1, cpu: 1, loop: 0, point: 1 },
    sources: [
      { name: 'Source 1', proto: 'demo', on: true, buf: [] },
      { name: 'Source 2', proto: 'modbus', on: true, buf: [] },
      { name: 'Source 3', proto: 'ascii', on: true, buf: [] },
    ],
    rows: [],
    traffic: false,
    timer: null,
    seq: 0,
    inject: '',
  };
  let host = null;

  const parseHexByte = (s) => { const v = parseInt(s, 16); return /^[0-9a-f]{2}$/i.test(s) ? v : null; };

  function eventPayload(ev, when = Math.floor(Date.now() / 1000)) {
    return [1, ev.obj, ev.code, ev.cpu, ev.loop, (ev.point >> 8) & 0xff, ev.point & 0xff, (when >>> 24) & 0xff, (when >>> 16) & 0xff, (when >>> 8) & 0xff, when & 0xff];
  }
  /* Structure d'une trame fictive : EN-TÊTE | LONGUEUR | SRC | DST | TYPE | DONNÉES | CONTRÔLE | PIED */
  function buildFrame(payload, type = TYPE_EVENT, cfg = state.cfg) {
    const h = parseHexByte(cfg.header);
    const f = parseHexByte(cfg.footer);
    if (h === null || f === null) return null;
    const checkSize = Checksums[cfg.check]([]).size;
    const total = 1 + cfg.lenWidth + 2 + 2 + payload.length + checkSize + 1;
    const body = [];
    if (cfg.lenWidth === 2) body.push(total & 0xff, (total >> 8) & 0xff); else body.push(total & 0xff);
    body.push(cfg.src & 0xff, cfg.dst & 0xff, (type >> 8) & 0xff, type & 0xff, ...payload);
    const c = Checksums[cfg.check](body);
    const chk = c.size === 2 ? [c.value & 0xff, (c.value >> 8) & 0xff] : [c.value];
    return { bytes: [h, ...body, ...chk, f], parts: { env: 1 + cfg.lenWidth + 4, pay: payload.length, chk: chk.length } };
  }
  function describeEvent(p) {
    if (p.length < 11) return L(`${p.length} octets, événement incomplet`, `${p.length} bytes, incomplete event`);
    const point = (p[5] << 8) | p[6];
    const when = ((p[7] << 24) | (p[8] << 16) | (p[9] << 8) | p[10]) >>> 0;
    const place = p[1] === 1 ? `CPU ${p[3]} / ${LOOP_WORD} ${LOOP_LETTERS[p[4]] || '?'} / Point ${point}` : `${OBJECTS[p[1]] || L('Objet', 'Object')} ${point}`;
    const time = new Date(when * 1000).toISOString().slice(11, 19);
    return `${CODES[p[2]] || `code ${p[2]}`} | ${place} | ${time} UTC`;
  }
  function addRow(row) {
    state.rows.unshift({ time: new Date(), id: ++state.seq, ...row });
    if (state.rows.length > 250) state.rows.pop();
    renderRows();
  }
  /* Dé-trameur : s'appuie sur la longueur annoncée, donc insensible à un octet de
     délimitation présent dans les données. Se resynchronise après une erreur. */
  function feedDemo(source, chunk) {
    const cfg = state.cfg;
    const buf = source.buf;
    buf.push(...chunk);
    const h = parseHexByte(cfg.header);
    const f = parseHexByte(cfg.footer);
    const checkSize = Checksums[cfg.check]([]).size;
    const minLen = 1 + cfg.lenWidth + 4 + checkSize + 1;
    for (;;) {
      const start = buf.indexOf(h);
      if (start < 0) { buf.length = 0; return; }
      if (start > 0) buf.splice(0, start);
      if (buf.length < 1 + cfg.lenWidth) return;
      const len = cfg.lenWidth === 2 ? buf[1] | (buf[2] << 8) : buf[1];
      if (len < minLen || len > 512) { buf.shift(); continue; }
      if (buf.length < len) return;
      if (buf[len - 1] !== f) { buf.shift(); continue; }
      const frame = buf.splice(0, len);
      const body = frame.slice(1, len - 1 - checkSize);
      const c = Checksums[cfg.check](body);
      const got = checkSize === 2 ? frame[len - 3] | (frame[len - 2] << 8) : frame[len - 2];
      const ok = c.value === got;
      const off = cfg.lenWidth;
      const type = (body[off + 2] << 8) | body[off + 3];
      const payload = body.slice(off + 4);
      let text = L(`${payload.length} octets : ${hexBytes(payload)}`, `${payload.length} bytes: ${hexBytes(payload)}`);
      if (type === TYPE_EVENT) text = describeEvent(payload);
      if (type === TYPE_ALIVE) text = L(`état courant : ${payload[0] || 0} feu(x), ${payload[1] || 0} défaut(s)`, `current state: ${payload[0] || 0} fire(s), ${payload[1] || 0} fault(s)`);
      addRow({ source, ok, src: body[off], dst: body[off + 1], len, type: `${TYPE_NAMES[type] || L('Inconnu', 'Unknown')} (0x${hex(type, 4)})`, text, raw: frame });
    }
  }
  function feedModbus(source, frame) {
    if (frame.length < 4) { addRow({ source, ok: false, src: '–', dst: '–', len: frame.length, type: L('Trame courte', 'Short frame'), text: L('Trame Modbus incomplète', 'Incomplete Modbus frame'), raw: frame }); return; }
    const body = frame.slice(0, -2);
    const got = frame[frame.length - 2] | (frame[frame.length - 1] << 8);
    const ok = Checksums['CRC-16/MODBUS'](body).value === got;
    const names = { 1: L('Lecture bobines', 'Read coils'), 2: L('Lecture entrées TOR', 'Read discrete inputs'), 3: L('Lecture registres', 'Read holding registers'), 4: L('Lecture registres d’entrée', 'Read input registers'), 5: L('Écriture bobine', 'Write single coil'), 6: L('Écriture registre', 'Write single register') };
    const fn = frame[1];
    let text = L(`${body.length - 2} octets de données`, `${body.length - 2} data bytes`);
    if (fn >= 1 && fn <= 4 && frame.length === 8) text = `${L('lecture', 'read')} @0x${hex((frame[2] << 8) | frame[3], 4)} × ${(frame[4] << 8) | frame[5]}`;
    addRow({ source, ok, src: '–', dst: frame[0], len: frame.length, type: `${names[fn] || L('Fonction', 'Function')} (0x${hex(fn)})`, text, raw: frame });
  }
  function feedAscii(source, bytes) {
    addRow({ source, ok: null, src: '–', dst: '–', len: bytes.length, type: 'ASCII', text: String.fromCharCode(...bytes), raw: bytes });
  }
  function feed(source, bytes) {
    if (source.proto === 'demo') feedDemo(source, bytes);
    else if (source.proto === 'modbus') feedModbus(source, bytes);
    else feedAscii(source, bytes);
  }

  /* Trafic simulé sur les trois sources virtuelles */
  const r = rng(99);
  function tick() {
    const roll = r();
    if (roll < 0.5) {
      const ev = { obj: 1, code: r.pick([1, 2, 3, 4, 5]), cpu: r.int(1, 4), loop: r.int(0, 5), point: r.int(1, 126) };
      const frame = buildFrame(eventPayload(ev));
      if (!frame) return;
      const bytes = frame.bytes.slice();
      if (r() < 0.12) bytes[bytes.length - 6] ^= 0x10;
      /* Livraison en deux morceaux, comme sur un vrai port série. */
      const cut = r.int(2, bytes.length - 2);
      feed(state.sources[0], bytes.slice(0, cut));
      setTimeout(() => feed(state.sources[0], bytes.slice(cut)), 120);
    } else if (roll < 0.62) {
      const frame = buildFrame([r.int(0, 1), r.int(0, 3)], TYPE_ALIVE);
      if (frame) feed(state.sources[0], frame.bytes);
    } else if (roll < 0.9) {
      const body = [r.int(1, 2), r.pick([1, 2, 3]), r.int(0, 2), r.int(0, 255), 0, r.int(1, 32)];
      const c = Checksums['CRC-16/MODBUS'](body).value;
      feed(state.sources[1], [...body, c & 0xff, c >> 8]);
    } else {
      const msg = r.pick(L(['Essai de la liaison', 'Imprimante : prete', 'Test operateur'], ['Link test', 'Printer: ready', 'Operator test']));
      feed(state.sources[2], Array.from(msg, (ch) => ch.charCodeAt(0)));
    }
  }
  const trafficLabel = (on) => (on ? L('Arrêter le trafic', 'Stop the traffic') : L('Démarrer le trafic', 'Start the traffic'));
  function setTraffic(on) {
    state.traffic = on;
    clearInterval(state.timer);
    state.timer = on ? setInterval(tick, 1000) : null;
    const b = host && $('#fr-traffic', host);
    if (b) { b.textContent = trafficLabel(on); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  }

  function renderPreview() {
    if (!host) return;
    const box = $('#fr-preview', host);
    const frame = buildFrame(eventPayload(state.ev));
    if (!frame) { box.innerHTML = `<span class="cell-bad">${L('En-tête ou pied invalide : deux caractères hexadécimaux attendus.', 'Invalid header or footer: two hexadecimal characters expected.')}</span>`; return; }
    const { bytes, parts } = frame;
    const seg = (cls, b, title) => `<span class="${cls}" title="${title}">${hexBytes(b)}</span>`;
    box.innerHTML = seg('seg-env', bytes.slice(0, parts.env), L('Enveloppe', 'Envelope')) + seg('seg-pay', bytes.slice(parts.env, parts.env + parts.pay), L('Événement', 'Event')) + seg('seg-chk', bytes.slice(parts.env + parts.pay, parts.env + parts.pay + parts.chk), L('Contrôle', 'Checksum')) + seg('seg-env', bytes.slice(-1), L('Pied', 'Footer'));
    $('#fr-decoded', host).textContent = describeEvent(eventPayload(state.ev));
    if (!state.inject) $('#fr-inject', host).placeholder = hexBytes(bytes);
  }
  function renderRows() {
    if (!host) return;
    const rows = state.rows.filter((x) => x.source.on);
    $('#fr-rows', host).innerHTML = rows.map((x) => `<tr>
      <td>${pad(x.time.getHours())}:${pad(x.time.getMinutes())}:${pad(x.time.getSeconds())}</td>
      <td><span class="source-dot" style="background:${SOURCE_COLORS[state.sources.indexOf(x.source)]}"></span>${esc(x.source.name)}</td>
      <td>${x.ok === null ? '–' : x.ok ? '<span class="pill ok">OK</span>' : '<span class="pill bad">KO</span>'}</td>
      <td>${esc(x.src)}</td><td>${esc(x.dst)}</td><td class="num">${x.len}</td><td>${esc(x.type)}</td><td>${esc(x.text)}</td><td>${hexBytes(x.raw)}</td></tr>`).join('');
    $('#fr-count', host).textContent = L(`${rows.length} trame(s)`, `${rows.length} frame(s)`);
  }
  const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${String(cur) === String(k) ? 'selected' : ''}>${v}</option>`).join('');

  App.pages.frames = {
    title: 'FoxFrameGenerator',
    mount(el) {
      host = el;
      const { cfg, ev } = state;
      el.innerHTML = `<header class="page-head">
        <div class="kicker">${L('Outil de test · C#, WPF, liaison série', 'Test tool · C#, WPF, serial link')}</div>
        <h1>FoxFrameGenerator</h1>
        <p>${L('Un collègue devait tester le firmware d’un écran sans disposer de la carte de traitement. Cet outil simule la centrale : il forge et envoie des trames sur un port série, puis écoute plusieurs ports à la fois, reconstitue les trames et les décode en clair.', 'A colleague needed to test a display’s firmware without having the processing board. This tool simulates the panel: it builds and sends frames on a serial port, then listens on several ports at once, reassembles the frames and decodes them into plain text.')}</p>
      </header>
      ${simBanner(L('Le port série est virtuel, et l’enveloppe comme la structure des événements sont inventées. Le protocole réel n’est pas publié. Modbus RTU, lui, est conforme au standard.', 'The serial port is virtual, and both the envelope and the event structure are made up. The real protocol is not published. Modbus RTU, however, follows the standard.'))}
      <div class="stack">
        <div class="grid two">
          <section class="card">
            <h3>${L('Construire un événement', 'Build an event')}</h3>
            <div class="form-grid">
              <label class="field">${L('Objet', 'Object')}<select data-ev="obj">${opts(OBJECTS, ev.obj)}</select></label>
              <label class="field">${L('Événement', 'Event')}<select data-ev="code">${opts(CODES, ev.code)}</select></label>
              <label class="field">CPU<select data-ev="cpu">${opts({ 1: 1, 2: 2, 3: 3, 4: 4 }, ev.cpu)}</select></label>
              <label class="field">${LOOP_WORD}<select data-ev="loop">${opts(Object.fromEntries(LOOP_LETTERS.map((l, i) => [i, l])), ev.loop)}</select></label>
              <label class="field">Point<input data-ev="point" type="number" min="1" max="126" value="${ev.point}"></label>
            </div>
            <p class="note" style="margin:10px 0 0">${L('Décodé :', 'Decoded:')} <span id="fr-decoded" class="mono"></span></p>
          </section>
          <section class="card">
            <h3>${L('Enveloppe paramétrable', 'Configurable envelope')}</h3>
            <div class="form-grid">
              <label class="field">${L('En-tête (hex)', 'Header (hex)')}<input data-cfg="header" value="${esc(cfg.header)}" maxlength="2"></label>
              <label class="field">${L('Pied (hex)', 'Footer (hex)')}<input data-cfg="footer" value="${esc(cfg.footer)}" maxlength="2"></label>
              <label class="field">${L('Longueur', 'Length')}<select data-cfg="lenWidth">${opts({ 1: L('1 octet', '1 byte'), 2: L('2 octets', '2 bytes') }, cfg.lenWidth)}</select></label>
              <label class="field">${L('Contrôle', 'Checksum')}<select data-cfg="check">${opts(Object.fromEntries(Object.keys(Checksums).map((k) => [k, k])), cfg.check)}</select></label>
              <label class="field">${L('Émetteur', 'Sender')}<input data-cfg="src" type="number" min="0" max="255" value="${cfg.src}"></label>
              <label class="field">${L('Destinataire', 'Recipient')}<input data-cfg="dst" type="number" min="0" max="255" value="${cfg.dst}"></label>
            </div>
          </section>
        </div>
        <section class="card">
          <h3>${L('Trame générée', 'Generated frame')}</h3>
          <div id="fr-preview" class="frame-preview"></div>
          <div class="legend" style="justify-content:flex-start;margin:8px 0 12px">
            <span><i class="seg-env" style="border-color:var(--line)"></i>${L('Enveloppe', 'Envelope')}</span>
            <span><i class="seg-pay" style="border-color:var(--accent)"></i>${L('Événement', 'Event')}</span>
            <span><i class="seg-chk" style="border-color:var(--warn)"></i>${L('Contrôle', 'Checksum')}</span>
          </div>
          <div class="btn-row">
            <button class="btn primary" id="fr-send">${L('Envoyer sur le port virtuel', 'Send on the virtual port')}</button>
            <button class="btn" id="fr-traffic" aria-pressed="false">${trafficLabel(false)}</button>
            <span class="spacer"></span>
            <input id="fr-inject" aria-label="${L('Trame à injecter en hexadécimal', 'Frame to inject, in hexadecimal')}" style="flex:1;min-width:220px;font-family:var(--mono)" value="${esc(state.inject)}">
            <button class="btn" id="fr-inject-go">${L('Injecter ces octets', 'Inject these bytes')}</button>
          </div>
          <p class="note" style="margin:8px 0 0">${L('L’injection passe par la même chaîne de décodage, sans matériel. Essayez de modifier un octet : la trame passe en KO. Remplacez un octet de données par l’en-tête : la trame reste délimitée correctement.', 'Injection goes through the same decoding chain, without hardware. Try changing a byte: the frame turns KO. Set a data byte to the header value: the frame is still delimited correctly.')}</p>
        </section>
        <section class="card">
          <div class="btn-row" style="margin-bottom:10px">
            <h3>${L('Réception : flux fusionné', 'Reception: merged stream')}</h3>
            <span class="spacer"></span>
            ${state.sources.map((s, i) => `<label class="check"><input type="checkbox" data-src="${i}" ${s.on ? 'checked' : ''}><span class="source-dot" style="background:${SOURCE_COLORS[i]};margin:0"></span>${esc(s.name)} <small>${{ demo: 'DEMO', modbus: 'Modbus RTU', ascii: 'ASCII' }[s.proto]}</small></label>`).join('')}
            <span class="note" id="fr-count"></span>
            <button class="btn" id="fr-log">${L('Journal CSV', 'CSV log')}</button>
            <button class="btn" id="fr-clear">${L('Effacer', 'Clear')}</button>
          </div>
          <div class="table-wrap frame-table"><table class="data"><thead><tr><th>${L('Heure', 'Time')}</th><th>Source</th><th>${L('Contrôle', 'Check')}</th><th>${L('Ém.', 'From')}</th><th>${L('Dest.', 'To')}</th><th class="num">${L('Long.', 'Len.')}</th><th>Type</th><th>${L('Contenu décodé', 'Decoded content')}</th><th>${L('Trame brute', 'Raw frame')}</th></tr></thead><tbody id="fr-rows"></tbody></table></div>
        </section>
      </div>`;
      $$('[data-ev]', el).forEach((i) => i.addEventListener('input', () => {
        ev[i.dataset.ev] = clamp(Number(i.value) || 0, 0, 65535);
        renderPreview();
      }));
      $$('[data-cfg]', el).forEach((i) => i.addEventListener('input', () => {
        const k = i.dataset.cfg;
        cfg[k] = ['lenWidth', 'src', 'dst'].includes(k) ? Number(i.value) : i.value;
        state.sources[0].buf.length = 0;
        renderPreview();
      }));
      $('#fr-send', el).addEventListener('click', () => {
        const f = buildFrame(eventPayload(ev));
        if (!f) { toast(L('Enveloppe invalide.', 'Invalid envelope.'), 'bad'); return; }
        feed(state.sources[0], f.bytes);
      });
      $('#fr-traffic', el).addEventListener('click', () => setTraffic(!state.traffic));
      $('#fr-inject', el).addEventListener('input', (e) => { state.inject = e.target.value; });
      $('#fr-inject-go', el).addEventListener('click', () => {
        const input = $('#fr-inject', el);
        const text = (input.value || input.placeholder).trim();
        const tokens = text.split(/\s+/);
        if (!tokens.every((t) => /^[0-9a-f]{2}$/i.test(t))) { toast(L('Saisissez des octets hexadécimaux séparés par des espaces.', 'Enter hexadecimal bytes separated by spaces.'), 'bad'); return; }
        const before = state.rows.length;
        feed(state.sources[0], tokens.map((t) => parseInt(t, 16)));
        if (state.rows.length === before) toast(L('Aucune trame complète trouvée dans ces octets : le dé-trameur attend la suite.', 'No complete frame found in these bytes: the deframer is waiting for the rest.'));
      });
      $$('[data-src]', el).forEach((c) => c.addEventListener('change', () => { state.sources[Number(c.dataset.src)].on = c.checked; renderRows(); }));
      $('#fr-clear', el).addEventListener('click', () => { state.rows = []; renderRows(); });
      $('#fr-log', el).addEventListener('click', () => {
        const rows = [L(['heure', 'source', 'controle', 'type', 'contenu', 'trame'], ['time', 'source', 'check', 'type', 'content', 'frame'])];
        state.rows.forEach((x) => rows.push([x.time.toISOString(), x.source.name, x.ok === null ? '' : x.ok ? 'OK' : 'KO', x.type, x.text, hexBytes(x.raw)]));
        download(L('journal_trames_demo.csv', 'frame_log_demo.csv'), csv(rows), 'text/csv;charset=utf-8');
      });
      renderPreview();
      renderRows();
      if (!state.rows.length) {
        const f = buildFrame(eventPayload(ev));
        if (f) feed(state.sources[0], f.bytes);
      }
      setTraffic(state.traffic);
    },
    unmount() { clearInterval(state.timer); state.timer = null; host = null; },
  };
})();
