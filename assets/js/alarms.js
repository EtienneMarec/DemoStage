/* Analyseur de journaux d'alarmes, version simulée : tout le journal est généré ici.
   Les cibles EEMUA 191 et ISA 18.2 sont publiques. */
'use strict';

(() => {
  const MIN = 60000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  const T0 = Date.UTC(2026, 2, 1);
  const SPAN = 30 * DAY;
  const ROOMS = ['Passerelle', 'Coursive A', 'Coursive B', 'Cabine 101', 'Cabine 102', 'Cabine 103', 'Cuisine', 'Salon', 'Machine', 'Local groupe', 'Atelier', 'Cale avant', 'Cale arrière', 'Local CO2', 'Infirmerie', 'Magasin'];
  const OPERATOR = new Set(['fire', 'fault', 'system']);
  const fmtDate = (t) => { const d = new Date(t); return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
  const fmtDur = (ms) => { if (ms < HOUR) return `${Math.round(ms / MIN)} min`; if (ms < DAY) return `${nf(ms / HOUR, 1)} h`; return `${nf(ms / DAY, 1)} j`; };

  function generate(seed, after) {
    const r = rng(seed);
    const ev = [];
    const tag = (n) => `FD${pad(n, 3)}`;
    const room = (n) => ROOMS[n % ROOMS.length];
    const push = (t, name, cat, state, desc) => { if (t <= T0 + SPAN) ev.push({ t, tag: name, cat, state, desc }); };
    const fault = (t, n, ackDelay, dur) => {
      const name = tag(n);
      push(t, name, 'fault', 'ACT', room(n));
      push(t + ackDelay, name, 'fault', 'ACK', room(n));
      if (dur != null) push(t + dur, name, 'fault', 'CLR', room(n));
    };
    /* Bruit de fond */
    const daily = after ? [2, 7] : [4, 14];
    for (let d = 0; d < 30; d++) {
      const n = r.int(daily[0], daily[1]);
      for (let i = 0; i < n; i++) fault(T0 + d * DAY + r() * DAY, r.int(1, 60), r.int(1, 8) * MIN, r.int(10, 180) * MIN);
    }
    /* Quelques feux brefs */
    for (let i = 0; i < 6; i++) {
      const t = T0 + r() * SPAN;
      const n = r.int(1, 60);
      push(t, tag(n), 'fire', 'ACT', room(n));
      push(t + r.int(1, 3) * MIN, tag(n), 'fire', 'ACK', room(n));
      push(t + r.int(5, 20) * MIN, tag(n), 'fire', 'CLR', room(n));
    }
    /* Tests de zone hebdomadaires */
    for (let w = 0; w < 4; w++) {
      const t = T0 + (w * 7 + 2) * DAY + 9 * HOUR;
      push(t, `ZONE${pad(w + 1)}`, 'test', 'TEST_ON', `Test zone ${w + 1}`);
      push(t + 25 * MIN, `ZONE${pad(w + 1)}`, 'test', 'TEST_OFF', `Test zone ${w + 1}`);
    }
    /* Rafales : une perte d'alimentation et un défaut de boucle */
    const floods = after ? [{ day: 6, size: 16, dur: 40 }] : [{ day: 6, size: 190, dur: 26 }, { day: 19, size: 64, dur: 16 }];
    floods.forEach(({ day, size, dur }) => {
      const start = T0 + day * DAY + 14 * HOUR + 12 * MIN;
      for (let i = 0; i < size; i++) {
        const t = start + r() * dur * MIN;
        if (i % 6 === 0) {
          const s = `SYS${pad(r.int(1, 8))}`;
          push(t, s, 'system', 'ACT', 'Défaut alimentation');
          push(t + r.int(5, 40) * MIN, s, 'system', 'ACK', 'Défaut alimentation');
          push(t + r.int(40, 120) * MIN, s, 'system', 'CLR', 'Défaut alimentation');
        } else fault(t, r.int(1, 30), r.int(2, 40) * MIN, r.int(30, 150) * MIN);
      }
    });
    if (!after) {
      /* Détecteur qui bat : activations en boucle plusieurs jours */
      [3, 11, 12, 23].forEach((d) => {
        const start = T0 + d * DAY + 2 * HOUR;
        for (let i = 0; i < 26; i++) fault(start + i * 7 * MIN + r() * MIN, 27, 30000, 3 * MIN);
      });
      /* Défauts restés actifs très longtemps */
      fault(T0 + 4 * DAY + 8 * HOUR, 112, 12 * MIN, null);
      fault(T0 + 9 * DAY + 11 * HOUR, 44, 80 * MIN, 18 * DAY);
      /* Une zone inhibée en boucle et une inhibition oubliée */
      for (let i = 0; i < 34; i++) {
        const t = T0 + r() * (SPAN - DAY);
        push(t, 'INH_036', 'inhibit', 'INH_ON', 'Atelier');
        push(t + r.int(5, 90) * MIN, 'INH_036', 'inhibit', 'INH_OFF', 'Atelier');
      }
      push(T0 + 21 * DAY + 16 * HOUR, 'INH_051', 'inhibit', 'INH_ON', 'Cabine 103');
    } else {
      for (let i = 0; i < 4; i++) {
        const t = T0 + r() * (SPAN - DAY);
        push(t, 'INH_036', 'inhibit', 'INH_ON', 'Atelier');
        push(t + 30 * MIN, 'INH_036', 'inhibit', 'INH_OFF', 'Atelier');
      }
    }
    return ev.sort((a, b) => a.t - b.t);
  }

  function analyse(events) {
    const op = events.filter((e) => e.state === 'ACT' && OPERATOR.has(e.cat));
    const nb = Math.ceil(SPAN / (10 * MIN));
    const buckets = new Array(nb).fill(0);
    op.forEach((e) => { buckets[Math.min(nb - 1, Math.floor((e.t - T0) / (10 * MIN)))] += 1; });
    const avg = op.length / nb;
    const peak = Math.max(...buckets);
    const peakAt = T0 + buckets.indexOf(peak) * 10 * MIN;
    const floodWindows = buckets.filter((b) => b > 10).length;
    const floodPct = (floodWindows / nb) * 100;
    const floods = [];
    let cur = null;
    buckets.forEach((b, i) => {
      if (b > 10) {
        if (!cur) cur = { start: T0 + i * 10 * MIN, n: 0, peak: 0, windows: 0 };
        cur.n += b; cur.peak = Math.max(cur.peak, b); cur.windows += 1;
      } else if (cur) { floods.push(cur); cur = null; }
    });
    if (cur) floods.push(cur);
    floods.forEach((f) => {
      const inside = op.filter((e) => e.t >= f.start && e.t < f.start + f.windows * 10 * MIN);
      const counts = new Map();
      inside.forEach((e) => counts.set(e.tag, (counts.get(e.tag) || 0) + 1));
      f.top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    });
    const counts = new Map();
    op.forEach((e) => {
      const x = counts.get(e.tag) || { tag: e.tag, desc: e.desc, n: 0 };
      x.n += 1;
      counts.set(e.tag, x);
    });
    const top = [...counts.values()].sort((a, b) => b.n - a.n);
    const top10 = top.slice(0, 10).reduce((s, x) => s + x.n, 0);
    const top10Pct = op.length ? (top10 / op.length) * 100 : 0;
    /* Fugaces : au moins 5 activations par heure, sur au moins 3 heures distinctes.
       Un tag présent dans une seule rafale n'est donc pas compté comme fugace. */
    const hourly = new Map();
    op.forEach((e) => { const k = `${e.tag}/${Math.floor(e.t / HOUR)}`; hourly.set(k, (hourly.get(k) || 0) + 1); });
    const chat = new Map();
    hourly.forEach((n, k) => {
      if (n < 5) return;
      const t = k.split('/')[0];
      const c = chat.get(t) || { hours: 0, peak: 0 };
      c.hours += 1;
      c.peak = Math.max(c.peak, n);
      chat.set(t, c);
    });
    const chatters = [...chat.entries()].filter(([, c]) => c.hours >= 3).map(([t, c]) => [t, c.peak]).sort((a, b) => b[1] - a[1]);
    /* Durées d'activité et d'acquittement */
    const active = new Map();
    const unack = new Map();
    const persistent = [];
    const acks = [];
    const end = T0 + SPAN;
    const inhibits = new Map();
    let inhibitCount = 0;
    events.forEach((e) => {
      if (OPERATOR.has(e.cat)) {
        if (e.state === 'ACT') { if (!active.has(e.tag)) active.set(e.tag, e); unack.set(e.tag, e.t); }
        if (e.state === 'ACK' && unack.has(e.tag)) { acks.push(e.t - unack.get(e.tag)); unack.delete(e.tag); }
        if (e.state === 'CLR' && active.has(e.tag)) {
          const a = active.get(e.tag);
          if (e.t - a.t > 7 * DAY) persistent.push({ tag: e.tag, desc: e.desc, dur: e.t - a.t, open: false });
          active.delete(e.tag);
        }
      }
      if (e.state === 'INH_ON') { inhibits.set(e.tag, e); inhibitCount += 1; }
      if (e.state === 'INH_OFF') inhibits.delete(e.tag);
    });
    active.forEach((a, t) => { if (end - a.t > 7 * DAY) persistent.push({ tag: t, desc: a.desc, dur: end - a.t, open: true }); });
    persistent.sort((a, b) => b.dur - a.dur);
    acks.sort((a, b) => a - b);
    const q = (p) => (acks.length ? acks[Math.min(acks.length - 1, Math.floor(p * acks.length))] : 0);
    /* Charge par jour : part normale et part en rafale */
    const days = Array.from({ length: 30 }, (_, d) => ({ d, normal: 0, flood: 0 }));
    op.forEach((e) => {
      const idx = Math.floor((e.t - T0) / (10 * MIN));
      const d = days[Math.min(29, Math.floor((e.t - T0) / DAY))];
      if (buckets[Math.min(nb - 1, idx)] > 10) d.flood += 1; else d.normal += 1;
    });
    return { events, total: events.length, opCount: op.length, tags: counts.size, avg, peak, peakAt, floodPct, floods, top, top10Pct, chatters, persistent, openInhibits: [...inhibits.values()], inhibitCount, ackMedian: q(0.5), ackP90: q(0.9), days };
  }

  /* Reconstitution : chaque ligne est une transition. L'écran à T est la réduction
     du flux jusqu'à T. */
  function reconstruct(events, T) {
    const s = { fire: new Map(), fault: new Map(), inhibit: new Map(), test: new Map() };
    for (const e of events) {
      if (e.t > T) break;
      const bucket = e.cat === 'fire' ? s.fire : e.cat === 'inhibit' ? s.inhibit : e.cat === 'test' ? s.test : s.fault;
      if (['ACT', 'INH_ON', 'TEST_ON'].includes(e.state)) bucket.set(e.tag, { ...e, since: e.t, acked: false });
      else if (e.state === 'ACK' && bucket.has(e.tag)) bucket.get(e.tag).acked = true;
      else if (['CLR', 'INH_OFF', 'TEST_OFF'].includes(e.state)) bucket.delete(e.tag);
    }
    return s;
  }

  const data = { before: null, after: null };
  const state = { log: 'before', compare: false, t: T0 + 6 * DAY + 14 * HOUR + 30 * MIN };
  let host = null;
  const A = () => data[state.log];

  function timelineSvg(events) {
    const W = 900;
    const H = 60;
    const n = 120;
    const bars = Array.from({ length: n }, () => ({ fire: 0, fault: 0, inhibit: 0, test: 0, t: null, rank: 0 }));
    const rank = { test: 1, inhibit: 2, fault: 3, system: 3, fire: 4 };
    events.forEach((e) => {
      if (!['ACT', 'INH_ON', 'TEST_ON'].includes(e.state)) return;
      const b = bars[Math.min(n - 1, Math.floor(((e.t - T0) / SPAN) * n))];
      const k = e.cat === 'system' ? 'fault' : e.cat;
      if (k in b) b[k] += 1;
      if ((rank[e.cat] || 0) > b.rank) { b.rank = rank[e.cat]; b.t = e.t; }
    });
    const max = Math.max(...bars.map((b) => b.fire + b.fault + b.inhibit + b.test), 1);
    const col = { 4: 'var(--fire)', 3: 'var(--series-4)', 2: 'var(--series-7)', 1: 'var(--series-1)' };
    const w = W / n;
    const rects = bars.map((b, i) => {
      const v = b.fire + b.fault + b.inhibit + b.test;
      if (!v) return '';
      const h = Math.max(3, Math.sqrt(v / max) * (H - 4));
      return `<rect x="${(i * w + 1).toFixed(1)}" y="${H - h}" width="${(w - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${col[b.rank] || 'var(--muted)'}" data-t="${b.t}" data-tip="${esc(`${fmtDate(T0 + (i / n) * SPAN)} · ${b.fire} feu(x), ${b.fault} défaut(s), ${b.inhibit} inhibition(s), ${b.test} test(s)`)}"/>`;
    }).join('');
    const cursor = ((state.t - T0) / SPAN) * W;
    return `<svg class="timeline-bars" id="al-bars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Frise de densité des événements du journal">
      ${rects}<rect x="0" y="0" width="${W}" height="${H}" fill="transparent" data-bg="1" style="display:none"/><line x1="${cursor}" x2="${cursor}" y1="0" y2="${H}" stroke="var(--text)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function panelHtml() {
    const s = reconstruct(A().events, state.t);
    const col = (title, map, cls) => {
      const items = [...map.values()].sort((a, b) => a.since - b.since);
      return `<div class="panel-col"><h4>${title}<span class="pill ${items.length ? cls : 'neutral'}">${items.length}</span></h4>
        ${items.length ? items.slice(0, 5).map((i) => `<div class="panel-item"><strong class="mono">${esc(i.tag)}</strong> ${esc(i.desc)}<small>depuis ${fmtDur(state.t - i.since)}${i.acked === false && map !== s.inhibit && map !== s.test ? ' · non acquitté' : ''}</small></div>`).join('') : '<p class="note" style="margin:0">Au repos</p>'}
        ${items.length > 5 ? `<p class="note" style="margin:4px 0 0">Et ${items.length - 5} autre(s)</p>` : ''}</div>`;
    };
    return col('Feux', s.fire, 'bad') + col('Défauts', s.fault, 'warn') + col('Hors service', s.inhibit, 'warn') + col('Tests de zone', s.test, 'info');
  }
  function renderReplay() {
    const box = $('#al-replay', host);
    const d = new Date(state.t);
    box.innerHTML = `<div class="btn-row" style="margin-bottom:8px">
        <strong class="mono" style="font-size:16px">${d.toISOString().slice(0, 16).replace('T', ' ')} UTC</strong>
        <span class="spacer"></span>
        <button class="btn" data-step="-1">Évt. précédent</button>
        <button class="btn" data-step="1">Évt. suivant</button>
      </div>
      <div class="panel-cols" style="margin-bottom:10px">${panelHtml()}</div>
      ${timelineSvg(A().events)}
      <input type="range" id="al-slider" min="0" max="2000" value="${Math.round(((state.t - T0) / SPAN) * 2000)}" aria-label="Instant reconstitué" style="width:100%;margin-top:4px">
      <div class="legend" style="justify-content:flex-start">
        <span><i style="background:var(--fire);border-color:var(--fire)"></i>Feu</span>
        <span><i style="background:var(--series-4);border-color:var(--series-4)"></i>Défaut</span>
        <span><i style="background:var(--series-7);border-color:var(--series-7)"></i>Inhibition</span>
        <span><i style="background:var(--series-1);border-color:var(--series-1)"></i>Test</span>
        <span>Chaque barre prend la couleur de l’événement le plus grave. Cliquez pour y sauter.</span>
      </div>`;
    $('#al-slider', box).addEventListener('input', (e) => { state.t = T0 + (Number(e.target.value) / 2000) * SPAN; renderReplayKeep(e.target.value); });
    $$('[data-step]', box).forEach((b) => b.addEventListener('click', () => {
      const ev = A().events;
      const dir = Number(b.dataset.step);
      const next = dir > 0 ? ev.find((x) => x.t > state.t) : [...ev].reverse().find((x) => x.t < state.t);
      if (next) { state.t = next.t; renderReplay(); }
    }));
    const bars = $('#al-bars', box);
    bars.addEventListener('click', (e) => { const t = e.target.dataset?.t; if (t && t !== 'null') { state.t = Number(t); renderReplay(); } });
    bars.addEventListener('mousemove', (e) => { const tip = e.target.dataset?.tip; if (tip) Tip.show(tip, e.clientX, e.clientY); else Tip.hide(); });
    bars.addEventListener('mouseleave', () => Tip.hide());
  }
  function renderReplayKeep(val) {
    renderReplay();
    const s = $('#al-slider', host);
    if (s) { s.value = val; s.focus(); }
  }
  function diagnostics(a) {
    const items = [];
    if (a.openInhibits.length) items.push(['bad', 'Priorité haute', 'Inhibitions non refermées', `${a.openInhibits.length} inhibition(s) encore active(s) en fin de journal : ${a.openInhibits.map((i) => `${i.tag} (${i.desc})`).join(', ')}. Un point désactivé puis oublié est un risque à lever.`]);
    if (a.peak > 10) items.push(['bad', 'Priorité haute', 'Rafales d’alarmes', `Jusqu’à ${a.peak} alarmes en 10 minutes le ${fmtDate(a.peakAt)}. L’opérateur est noyé au moment où il doit décider.`]);
    if (a.chatters.length) items.push(['warn', 'À traiter', 'Alarmes fugaces', `${a.chatters[0][0]} monte à ${a.chatters[0][1]} activations par heure. Une temporisation ou une hystérésis réduirait ce bruit.`]);
    if (a.persistent.length) items.push(['warn', 'À traiter', 'Défauts persistants', `${a.persistent[0].tag} (${a.persistent[0].desc}) est resté actif ${fmtDur(a.persistent[0].dur)}. C’est plus un défaut non traité qu’un événement ponctuel.`]);
    if (a.ackP90 > 20 * MIN) items.push(['info', 'À surveiller', 'Acquittement lent sur la traîne', `Le p90 du temps d’acquittement est de ${fmtDur(a.ackP90)}, pour une médiane de ${fmtDur(a.ackMedian)}.`]);
    if (!items.length) items.push(['ok', 'Conforme', 'Aucun point bloquant', 'Le journal respecte les cibles de charge d’alarmes sur cette période.']);
    return items;
  }
  function eemuaRow(label, sub, value, unit, target, ok, ratio) {
    return `<div class="eemua-row"><div><strong>${label}</strong><br><small>${sub}</small></div>
      <div style="text-align:right"><strong style="font-size:18px">${value}</strong> <small>${unit}</small><br><small>cible ${target}</small> <span class="pill ${ok ? 'ok' : 'bad'}">${ok ? 'Conforme' : 'Hors cible'}</span></div>
      <div class="meter"><i class="${ok ? '' : 'bad'}" style="width:${clamp(ratio * 50, 2, 100)}%"></i></div></div>`;
  }
  function chartSvg(a) {
    const W = 620;
    const H = 230;
    const L = 34;
    const B = 22;
    const T = 8;
    const max = Math.max(...a.days.map((d) => d.normal + d.flood), 10);
    const step = Math.max(5, Math.ceil(max / 4 / 5) * 5);
    const y = (v) => T + (H - T - B) * (1 - v / (step * Math.ceil(max / step)));
    const top = step * Math.ceil(max / step);
    let g = '';
    for (let v = 0; v <= top; v += step) g += `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    const bw = (W - L) / 30;
    const rounded = (x, yy, w, h) => { const r = Math.min(3, w / 2, h); return `M${x} ${yy + h}V${yy + r}Q${x} ${yy} ${x + r} ${yy}H${x + w - r}Q${x + w} ${yy} ${x + w} ${yy + r}V${yy + h}Z`; };
    let bars = '';
    a.days.forEach((d) => {
      const x = L + d.d * bw + 1.5;
      const w = bw - 3;
      const base = y(0);
      const hN = base - y(d.normal);
      const hF = base - y(d.flood);
      const tip = esc(`${pad(d.d + 1)}/03 : ${d.normal + d.flood} alarmes, dont ${d.flood} en rafale`);
      if (d.flood) {
        bars += hN > 0 ? `<rect x="${x}" y="${base - hN}" width="${w}" height="${Math.max(0, hN - 1)}" fill="var(--series-1)" data-tip="${tip}"/>` : '';
        bars += `<path d="${rounded(x, base - hN - hF - 1, w, hF)}" fill="var(--fire)" data-tip="${tip}"/>`;
      } else if (hN > 0) bars += `<path d="${rounded(x, base - hN, w, hN)}" fill="var(--series-1)" data-tip="${tip}"/>`;
      bars += `<rect x="${L + d.d * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" data-tip="${tip}"/>`;
    });
    const labels = [0, 7, 14, 21, 28].map((d) => `<text x="${L + (d + 0.5) * bw}" y="${H - 6}" text-anchor="middle">${pad(d + 1)}/03</text>`).join('');
    return `<svg class="chart" id="al-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Alarmes opérateur par jour, avec la part en rafale">${g}${bars}${labels}</svg>
      <div class="legend" style="justify-content:flex-start"><span><i style="background:var(--series-1);border-color:var(--series-1)"></i>Alarmes hors rafale</span><span><i style="background:var(--fire);border-color:var(--fire)"></i>Alarmes en rafale (plus de 10 en 10 min)</span></div>`;
  }
  function compareHtml() {
    const a = data.before;
    const b = data.after;
    const rows = [
      ['Alarmes opérateur', a.opCount, b.opCount, (v) => nf(v)],
      ['Taux moyen par 10 min', a.avg, b.avg, (v) => nf(v, 2)],
      ['Pic sur 10 min', a.peak, b.peak, (v) => nf(v)],
      ['Temps en rafale (%)', a.floodPct, b.floodPct, (v) => nf(v, 2)],
      ['Poids des 10 pires tags (%)', a.top10Pct, b.top10Pct, (v) => nf(v, 1)],
      ['Inhibitions non refermées', a.openInhibits.length, b.openInhibits.length, (v) => nf(v)],
    ];
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Indicateur</th><th class="num">Avant</th><th class="num">Après</th><th class="num">Écart</th></tr></thead>
      <tbody>${rows.map(([k, x, y, f]) => { const d = y - x; return `<tr><td>${k}</td><td class="num">${f(x)}</td><td class="num">${f(y)}</td><td class="num"><span class="pill ${d < 0 ? 'ok' : d > 0 ? 'bad' : 'neutral'}">${d < 0 ? '▼' : d > 0 ? '▲' : '='} ${f(Math.abs(d))}</span></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  function renderAll() {
    const a = A();
    $('#al-log', host).innerHTML = `<button class="btn ${state.log === 'before' ? 'on' : ''}" data-log="before">Journal avant intervention</button>
      <button class="btn ${state.log === 'after' ? 'on' : ''}" data-log="after">Journal après intervention</button>
      <button class="btn ${state.compare ? 'on' : ''}" data-log="compare" aria-pressed="${state.compare}">Comparer les deux</button>
      <span class="spacer"></span>
      <button class="btn" data-log="csv">Télécharger le journal fictif</button>`;
    $('#al-compare', host).innerHTML = state.compare ? `<section class="card"><h3>Avant / après : prouver qu’une intervention a réduit la charge</h3>${compareHtml()}</section>` : '';
    $('#al-kpis', host).innerHTML = [
      [nf(a.total), `Événements sur 30 jours`], [nf(a.opCount), `Alarmes opérateur, ${a.tags} tags`], [nf(a.avg, 2), 'Alarmes par 10 min'],
      [`${nf(a.floodPct, 1)} %`, 'Temps en rafale'], [nf(a.inhibitCount), 'Inhibitions'], [fmtDur(a.ackMedian), 'Acquittement médian'],
    ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('');
    $('#al-diag', host).innerHTML = diagnostics(a).map(([k, p, t, m]) => `<div class="diag-item"><h4>${t}<span class="pill ${k}">${p}</span></h4>${esc(m)}</div>`).join('');
    $('#al-eemua', host).innerHTML = `<h3>Évaluation EEMUA 191 et ISA 18.2</h3>
      ${eemuaRow('Taux moyen', 'sur toute la période', nf(a.avg, 2), 'par 10 min', '≤ 1', a.avg <= 1, a.avg / 1)}
      ${eemuaRow('Pic sur 10 minutes', `le ${fmtDate(a.peakAt)}`, a.peak, 'alarmes', '≤ 10', a.peak <= 10, a.peak / 10)}
      ${eemuaRow('Temps passé en rafale', 'fenêtres de 10 min saturées', nf(a.floodPct, 2), '%', '< 1 %', a.floodPct < 1, a.floodPct / 1)}
      ${eemuaRow('Poids des 10 pires tags', 'concentration de la charge', nf(a.top10Pct, 1), '%', '< 20 %', a.top10Pct < 20, a.top10Pct / 20)}`;
    $('#al-chart-box', host).innerHTML = `<h3>Charge d’alarmes par jour</h3>${chartSvg(a)}`;
    const chart = $('#al-chart', host);
    chart.addEventListener('mousemove', (e) => { const tip = e.target.dataset?.tip; if (tip) Tip.show(tip, e.clientX, e.clientY); else Tip.hide(); });
    chart.addEventListener('mouseleave', () => Tip.hide());
    $('#al-floods', host).innerHTML = a.floods.length ? a.floods.map((f) => `<tr class="clickable" data-t="${f.start}"><td>${fmtDate(f.start)}</td><td class="num">${f.windows * 10} min</td><td class="num">${f.n}</td><td class="num">${f.peak}</td><td class="mono">${f.top.map(([t, n]) => `${t} ×${n}`).join(' · ')}</td></tr>`).join('') : '<tr><td colspan="5">Aucune rafale sur la période.</td></tr>';
    $('#al-bad', host).innerHTML = a.top.slice(0, 10).map((x) => `<tr><td class="mono">${esc(x.tag)}</td><td>${esc(x.desc)}</td><td class="num">${x.n}</td><td><span class="bar-mini"><i style="width:${(x.n / a.top[0].n) * 100}%"></i></span>${nf((x.n / a.opCount) * 100, 1)} %</td></tr>`).join('');
    renderReplay();
  }

  App.pages.alarms = {
    title: 'Analyseur d’alarmes',
    mount(el) {
      host = el;
      if (!data.before) {
        data.before = analyse(generate(31, false));
        data.after = analyse(generate(32, true));
      }
      el.innerHTML = `<header class="page-head">
        <div class="kicker">Analyse · HTML, JavaScript · 100 % hors-ligne · Issu du PhoenixLogViewer</div>
        <h1>Analyseur de journaux d’alarmes</h1>
        <p>Un export de centrale compte souvent plus de dix mille lignes, illisibles à l’œil nu. L’outil les transforme en diagnostic noté selon les standards de gestion d’alarme, et rejoue ce que la centrale affichait à n’importe quel instant.</p>
      </header>
      ${simBanner('Le journal de ces 30 jours est entièrement généré, avec une rafale, une alarme fugace, un défaut oublié et une inhibition non refermée. Aucun journal de navire réel n’est utilisé.')}
      <div class="stack">
        <div class="btn-row" id="al-log"></div>
        <div id="al-compare"></div>
        <section class="card"><h3>Reconstitution de la centrale à l’instant T</h3><div id="al-replay"></div></section>
        <div class="kpis" id="al-kpis" style="margin:0"></div>
        <section class="card"><h3>Diagnostic et recommandations</h3><div class="diag" id="al-diag"></div></section>
        <div class="grid two">
          <section class="card" id="al-chart-box"></section>
          <section class="card" id="al-eemua"></section>
        </div>
        <section class="card"><h3>Épisodes de rafale</h3><p class="note">Cliquez sur un épisode pour caler la reconstitution dessus.</p>
          <div class="table-wrap"><table class="data"><thead><tr><th>Début</th><th class="num">Durée</th><th class="num">Alarmes</th><th class="num">Pic /10 min</th><th>Principaux responsables</th></tr></thead><tbody id="al-floods"></tbody></table></div></section>
        <section class="card"><h3>Les pires tags (bad actors)</h3>
          <div class="table-wrap"><table class="data"><thead><tr><th>Tag</th><th>Désignation</th><th class="num">Activations</th><th>Part de la charge</th></tr></thead><tbody id="al-bad"></tbody></table></div></section>
      </div>`;
      $('#al-log', el).addEventListener('click', (e) => {
        const b = e.target.closest('[data-log]');
        if (!b) return;
        const v = b.dataset.log;
        if (v === 'compare') state.compare = !state.compare;
        else if (v === 'csv') {
          const lines = ['horodatage;tag;etat;designation', ...A().events.map((x) => `${new Date(x.t).toISOString()};${x.tag};${x.state};${x.desc}`)];
          download(`journal_fictif_${state.log}.csv`, `﻿${lines.join('\n')}`, 'text/csv;charset=utf-8');
          return;
        } else state.log = v;
        renderAll();
      });
      $('#al-floods', el).addEventListener('click', (e) => {
        const tr = e.target.closest('[data-t]');
        if (tr) { state.t = Number(tr.dataset.t) + 5 * MIN; renderReplay(); $('#al-replay', el).scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      });
      renderAll();
    },
    unmount() { host = null; },
  };
})();
