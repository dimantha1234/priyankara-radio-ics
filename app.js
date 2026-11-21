'use strict';
// Parts finder. Data comes only from parts.json. Column 1 is left, row 1 is top.

const $ = id => document.getElementById(id);
const LIMIT = 40;
const sheet = $('sheet');

let cabs = [];     // cabinets from parts.json
let index = [];    // one entry per part occurrence: { ci, d, part, keys }
let cur = 0;       // cabinet shown in the cabinet view
let query = [''];  // normalised forms of the search text
let hits = null;   // matching index entries in display order, null when not searching

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const where = d => `Column ${d.column}, row ${d.row}`;
const code = d => `C${d.column}-R${d.row}`;

// Ignore case, spaces, dashes and dots. Also keep the form without a leading
// "2S" before A/B/C/D/J/K + digit, so 2SD1402 and D1402 compare equal.
function forms(s) {
  const n = s.toUpperCase().replace(/[\s.\-]/g, '');
  const t = n.replace(/^2S(?=[ABCDJK]\d)/, '');
  return t === n ? [n] : [n, t];
}

// 0 exact, 1 starts with, 2 contains, 3 no match.
function rank(keys, qs) {
  let r = 3;
  for (const q of qs) for (const k of keys)
    r = Math.min(r, k === q ? 0 : k.startsWith(q) ? 1 : k.includes(q) ? 2 : 3);
  return r;
}

function search() {
  const out = [];
  for (const e of index) {
    const r = rank(e.keys, query);
    if (r < 3) out.push({ e, r });
  }
  // Stable sort: ties keep cabinet/drawer/part order from parts.json.
  out.sort((a, b) => a.r - b.r || a.e.keys[0].length - b.e.keys[0].length);
  return out.map(x => x.e);
}

function update() {
  const raw = $('q').value.trim();
  query = forms(raw);
  hits = query[0] ? search() : null;
  showResults(raw);
  drawCabinet();
}

function showResults(raw) {
  const list = $('results'), status = $('status');
  list.replaceChildren();
  $('more').hidden = !hits || hits.length <= LIMIT;
  if (!hits) {
    status.textContent = 'Type a part number, or tap a drawer to browse.';
    return;
  }
  if (!hits.length) {
    status.textContent = `No part matches "${raw}". Check the number, or tap a drawer to browse.`;
    return;
  }
  const drawers = new Set(hits.map(h => h.d)).size;
  status.textContent = `${pl(hits.length, 'match', 'matches')} in ${pl(drawers, 'drawer', 'drawers')}`;
  for (const h of hits.slice(0, LIMIT)) {
    const loc = where(h.d);
    const b = el('button', 'result');
    b.type = 'button';
    b.setAttribute('aria-label', `${h.part}, ${cabs.length > 1 ? cabs[h.ci].name + ', ' : ''}${loc}`);
    const right = el('span', 'loc', loc);
    if (cabs.length > 1) right.prepend(el('small', '', cabs[h.ci].name));
    b.append(el('span', 'pn', h.part), right);
    b.onclick = () => { if (h.ci !== cur) setCab(h.ci); openSheet(h.ci, h.d); };
    const li = el('li');
    li.append(b);
    list.append(li);
  }
}

function drawCabinet() {
  const cab = cabs[cur], box = $('cabinet');
  const searching = hits && hits.length > 0;
  const count = new Map();
  if (searching) for (const h of hits) if (h.ci === cur) count.set(h.d, (count.get(h.d) || 0) + 1);

  const cols = el('div', 'colnums'), rows = el('div', 'rownums'), frame = el('div', 'frame');
  cols.setAttribute('aria-hidden', 'true');
  rows.setAttribute('aria-hidden', 'true');
  for (let c = 1; c <= cab.columns; c++) cols.append(el('span', '', c));
  for (let r = 1; r <= cab.rows; r++) {
    rows.append(el('span', '', r));
    for (let c = 1; c <= cab.columns; c++) {
      const d = cab.drawers.find(x => x.column === c && x.row === r)
        || { column: c, row: r, parts: [], note: '' };
      const n = count.get(d) || 0;
      const b = el('button', 'drawer' + (searching ? (n ? ' hit' : ' dim') : ''));
      b.type = 'button';
      b.setAttribute('aria-label',
        `${where(d)}, ${pl(d.parts.length, 'part', 'parts')}${n ? `, ${n} matching` : ''}`);
      const card = el('span', 'card', code(d));
      if (n > 1) card.append(el('span', 'n', `${n} parts`));
      b.append(card);
      b.onclick = () => openSheet(cur, d);
      frame.append(b);
    }
  }
  box.style.setProperty('--cols', cab.columns);
  box.style.setProperty('--rows', cab.rows);
  box.setAttribute('aria-label', cab.name);
  box.replaceChildren(cols, rows, frame);
}

function setCab(i) {
  cur = i;
  [...$('switcher').children].forEach((b, j) => b.setAttribute('aria-pressed', j === i));
  drawCabinet();
}

function openSheet(ci, d) {
  const cab = cabs[ci];
  $('sheet-cab').hidden = cabs.length < 2;
  $('sheet-cab').textContent = cab.name;
  $('sheet-title').textContent = where(d);
  $('sheet-sub').textContent = `Drawer ${code(d)}, ${pl(d.parts.length, 'part', 'parts')}`;
  $('sheet-parts').replaceChildren(...d.parts.map(p => {
    const li = el('li', '', p);
    if (query[0] && rank(forms(p), query) < 3) {
      li.className = 'match';
      li.append(el('span', 'visually-hidden', ' (matches search)'));
    }
    return li;
  }));
  $('sheet-note').hidden = !d.note;
  $('sheet-note').textContent = d.note || '';
  const map = $('sheet-map');
  map.style.setProperty('--cols', cab.columns);
  map.replaceChildren();
  for (let r = 1; r <= cab.rows; r++)
    for (let c = 1; c <= cab.columns; c++)
      map.append(el('span', c === d.column && r === d.row ? 'on' : ''));
  sheet.showModal();
}

function init(data) {
  cabs = data.cabinets;
  $('shop').textContent = data.shop || '';
  cabs.forEach((cab, ci) => cab.drawers.forEach(d => d.parts.forEach(part =>
    index.push({ ci, d, part, keys: forms(part) }))));

  if (cabs.length > 1) {
    const sw = $('switcher');
    cabs.forEach((cab, i) => {
      const b = el('button', 'tab', cab.name);
      b.type = 'button';
      b.setAttribute('aria-label', `Show ${cab.name}`);
      b.setAttribute('aria-pressed', i === cur);
      b.onclick = () => setCab(i);
      sw.append(b);
    });
    sw.hidden = false;
  }

  const q = $('q');
  q.addEventListener('input', update);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') q.blur(); });  // hide iPhone keyboard
  update();
}

$('done').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });  // backdrop
// Escape closes a modal <dialog> natively.

fetch('parts.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(init)
  .catch(() => {
    $('status').textContent = 'Could not load parts.json. Open the app once while online, then try again.';
  });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
