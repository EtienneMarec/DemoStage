/* Rendu d'une grille Cause & Effects (5 x 6 cases) et évaluation de sa logique.
   Pictogrammes dessinés pour la démo, partagés par FOX_Soft et l'analyse de flotte. */
'use strict';

const CE = (() => {
  const ROWS = 5;
  const COLS = 6;

  const flame = (c = '#d9362b') => `<path d="M0-13c1 5 7 7 7 14a7 7 0 0 1-14 0c0-3 2-5 3-7 1 2 2 3 3 3 1-3 0-6 1-10z" fill="${c}"/>`;
  const triangle = (c, inner = '') => `<path d="M0-12 12 9H-12z" fill="#fff" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>${inner}`;
  const bang = '<path d="M0-5v7M0 4.5v2" stroke="#10202e" stroke-width="2" stroke-linecap="round"/>';
  const cross = '<path d="M-4-2 4 6M4-2-4 6" stroke="#10202e" stroke-width="2" stroke-linecap="round"/>';
  const slash = '<path d="M-14-12 14 12" stroke="#10202e" stroke-width="2.2"/>';
  const clock = '<circle r="11" fill="#fff" stroke="#10202e" stroke-width="2"/><path d="M0-7v7l5 3" stroke="#10202e" stroke-width="2" fill="none" stroke-linecap="round"/>';
  const pulse = '<rect x="-12" y="-10" width="24" height="20" rx="3" fill="#fff" stroke="#10202e" stroke-width="2"/><path d="M-9 3h4v-7h4v7h4v-7h4v7" stroke="#10202e" stroke-width="1.8" fill="none"/>';
  const horn = '<path d="M-9-4h5l9-7v22l-9-7h-5z" fill="#fff" stroke="#10202e" stroke-width="2" stroke-linejoin="round"/><path d="M8-5q4 5 0 10" stroke="#10202e" stroke-width="2" fill="none"/>';
  const relay = '<path d="M-10 3h5l8-7M4 3h6" stroke="#10202e" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  const msg = '<rect x="-12" y="-9" width="24" height="18" rx="2" fill="#fff" stroke="#10202e" stroke-width="2"/><path d="M-7-3h14M-7 3h9" stroke="#10202e" stroke-width="1.8"/>';

  const ZONE_OR_POINT = L('Zone ou point', 'Zone or point');
  /* kind : cause | func | effect | hlink | vlink ; group : cause | func | effect */
  const TOOLS = {
    fire: { label: L('Feu', 'Fire'), kind: 'cause', group: 'cause', icon: flame(), needs: ZONE_OR_POINT },
    fault: { label: L('Défaut', 'Fault'), kind: 'cause', group: 'cause', icon: triangle('#d9720a', bang), needs: ZONE_OR_POINT },
    disable: { label: L('Hors service', 'Disablement'), kind: 'cause', group: 'cause', icon: triangle('#10202e', cross), needs: ZONE_OR_POINT },
    tech: { label: L('Alarme technique', 'Technical alarm'), kind: 'cause', group: 'cause', icon: '<circle r="10" fill="#fff" stroke="#c99400" stroke-width="2.6"/><circle r="4" fill="#c99400"/>', needs: 'Point' },
    nofire: { label: L('Pas de feu', 'No fire'), kind: 'cause', group: 'cause', icon: flame() + slash, negated: true, needs: ZONE_OR_POINT },
    hlink: { label: L('Liaison horizontale', 'Horizontal link'), kind: 'hlink', group: 'func', icon: '<path d="M-13 0H13" stroke="#10202e" stroke-width="2.4"/>' },
    vlink: { label: L('Liaison verticale (OU)', 'Vertical link (OR)'), kind: 'vlink', group: 'func', icon: '<path d="M-13-5H13M0-5V12" stroke="#10202e" stroke-width="2.4"/>' },
    timer: { label: L('Temporisation', 'Timer'), kind: 'func', group: 'func', icon: clock, needs: L('Durée', 'Delay') },
    flash: { label: L('Relais clignotant', 'Flashing relay'), kind: 'func', group: 'func', icon: pulse },
    sounder: { label: L('Sirène', 'Sounder'), kind: 'effect', group: 'effect', icon: horn, needs: L('Groupe', 'Group') },
    output: { label: L('Sortie programmable', 'Programmable output'), kind: 'effect', group: 'effect', icon: relay, needs: L('Sortie', 'Output') },
    message: { label: L('Message affiché', 'Displayed message'), kind: 'effect', group: 'effect', icon: msg, needs: 'Message' },
  };
  const GROUPS = { cause: 'Causes', func: L('Fonctions', 'Functions'), effect: L('Effets', 'Effects') };

  const emptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  /* Évalue la logique, colonne par colonne, à partir du rail gauche.
     out[r][c] : la case r,c transmet-elle le courant vers la droite ? */
  function evaluate(grid, active = () => false) {
    const out = emptyGrid().map((row) => row.map(() => false));
    const lit = emptyGrid().map((row) => row.map(() => false));
    for (let c = 0; c < COLS; c++) {
      const input = (r) => (c === 0 ? true : out[r][c - 1]);
      for (let r = 0; r < ROWS; r++) {
        const cell = grid[r][c];
        if (!cell) continue;
        const t = TOOLS[cell.tool];
        if (t.kind === 'cause') {
          const a = active(r, c);
          out[r][c] = input(r) && (t.negated ? !a : a);
          lit[r][c] = out[r][c];
        } else if (t.kind === 'func' || t.kind === 'hlink' || t.kind === 'vlink') {
          out[r][c] = c > 0 && input(r);
          lit[r][c] = out[r][c];
        } else {
          lit[r][c] = c > 0 && input(r);
        }
      }
      /* Une liaison verticale réunit sa ligne et la ligne du dessous (OU logique). */
      for (let r = ROWS - 2; r >= 0; r--) {
        const cell = grid[r][c];
        if (cell && TOOLS[cell.tool].kind === 'vlink') {
          const below = grid[r + 1][c];
          if (below && ['hlink', 'vlink'].includes(TOOLS[below.tool].kind)) {
            const merged = out[r][c] || out[r + 1][c];
            out[r][c] = merged; out[r + 1][c] = merged;
            lit[r][c] = merged; lit[r + 1][c] = merged;
          }
        }
      }
    }
    return { out, lit };
  }

  function cellSvg(cell, live) {
    const t = TOOLS[cell.tool];
    const W = 'class="ce-wire' + (live ? ' live' : '') + '"';
    const sym = `<g class="ce-sym ${live ? 'live' : ''}" transform="translate(50 36)">${t.icon}</g>`;
    if (t.kind === 'hlink') return `<svg viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true"><path ${W} vector-effect="non-scaling-stroke" d="M0 36H100"/></svg>`;
    if (t.kind === 'vlink') return `<svg viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true"><path ${W} vector-effect="non-scaling-stroke" d="M0 36H100M50 36V84"/></svg>`;
    if (t.kind === 'cause' || t.kind === 'func') {
      return `<svg viewBox="0 0 100 84" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path ${W} d="M-40 36H28M72 36H140"/><path ${W} d="M30 18V54M70 18V54"/>${sym}</svg>`;
    }
    return `<svg viewBox="0 0 100 84" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path ${W} d="M-40 36H24"/><path ${W} d="M28 16Q18 36 28 56M72 16Q82 36 72 56"/><path ${W} d="M76 36H140"/>${sym}</svg>`;
  }

  /* Les liaisons verticales descendent sur la case du dessous : on y prolonge le trait. */
  function gridHtml(grid, opts = {}) {
    const { lit, selected } = opts;
    let html = `<div class="ce-grid ${opts.static ? 'static' : ''}" role="grid" aria-label="${L('Grille Cause & Effects', 'Cause & Effects grid')}">`;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        const isSel = selected && selected[0] === r && selected[1] === c;
        let inner = '';
        if (cell) {
          inner = cellSvg(cell, lit && lit[r][c]);
          if (cell.param) inner += `<span class="lbl">${esc(cell.param)}</span>`;
        }
        if (r > 0 && grid[r - 1][c] && TOOLS[grid[r - 1][c].tool].kind === 'vlink') {
          const live = lit && lit[r - 1][c];
          inner += `<svg viewBox="0 0 100 84" preserveAspectRatio="none" aria-hidden="true"><path class="ce-wire ${live ? 'live' : ''}" vector-effect="non-scaling-stroke" d="M50 0V36"/></svg>`;
        }
        const label = cell ? TOOLS[cell.tool].label + (cell.param ? ` ${cell.param}` : '') : L('Case vide', 'Empty cell');
        html += `<div class="ce-cell ${cell ? 'used' : ''} ${isSel ? 'selected' : ''}" role="gridcell" data-r="${r}" data-c="${c}" aria-label="${L(`Ligne ${r + 1}, colonne ${c + 1} : `, `Row ${r + 1}, column ${c + 1}: `)}${esc(label)}">${inner}</div>`;
      }
    }
    return `${html}</div>`;
  }

  /* Signature canonique : décrit la forme de la logique, sans les noms. */
  function signature(grid) {
    const parts = [];
    let minC = COLS;
    let minR = ROWS;
    grid.forEach((row, r) => row.forEach((cell, c) => {
      if (cell) { minC = Math.min(minC, c); minR = Math.min(minR, r); }
    }));
    grid.forEach((row, r) => row.forEach((cell, c) => {
      if (cell) parts.push(`${r - minR}.${c - minC}:${cell.tool}`);
    }));
    const text = parts.join('|');
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return { text, hash: (h >>> 0).toString(16).padStart(8, '0') };
  }

  function issues(grid) {
    const found = [];
    const has = (k) => grid.flat().some((cell) => cell && TOOLS[cell.tool].kind === k);
    if (!grid.flat().some(Boolean)) return found;
    if (!has('cause')) found.push(L('aucune cause', 'no cause'));
    if (!has('effect')) found.push(L('aucun effet', 'no effect'));
    grid.forEach((row) => row.forEach((cell) => {
      if (cell && TOOLS[cell.tool].needs && !cell.param) found.push(L(`« ${TOOLS[cell.tool].label} » sans paramètre`, `"${TOOLS[cell.tool].label}" has no parameter`));
    }));
    return found;
  }

  return { ROWS, COLS, TOOLS, GROUPS, emptyGrid, evaluate, gridHtml, signature, issues };
})();
