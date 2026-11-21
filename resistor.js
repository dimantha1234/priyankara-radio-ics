'use strict';
// Resistor color code: type a value, pick a unit, see the bands.
// Loaded after app.js (uses its $ helper).

// [name, band color, text color that reads on it]
const DIGIT = [
  ['Black', '#1c1c1c', '#fff'], ['Brown', '#7b4a1e', '#fff'], ['Red', '#d32f2f', '#fff'],
  ['Orange', '#f57c00', '#111'], ['Yellow', '#fdd835', '#111'], ['Green', '#2e9b3e', '#111'],
  ['Blue', '#1e5fd0', '#fff'], ['Violet', '#8e44c4', '#fff'], ['Grey', '#8c8c8c', '#111'],
  ['White', '#f5f5f5', '#111'],
];
const GOLD = ['Gold', '#c9a227', '#111'], SILVER = ['Silver', '#b9bec4', '#111'];
// Multiplier text by power of ten, -2 .. 9.
const TIMES = ['×0.01', '×0.1', '×1', '×10', '×100', '×1k', '×10k', '×100k', '×1M', '×10M', '×100M', '×1G'];
// n = significant digits; x = band positions in the drawing (last one is tolerance).
const TYPES = [
  { n: 2, name: '4-band', kind: 'carbon film', body: '#dcbf8f', tol: GOLD, tolText: '±5%', x: [76, 100, 124, 228] },
  { n: 3, name: '5-band', kind: 'metal film', body: '#86b6dd', tol: DIGIT[1], tolText: '±1%', x: [72, 94, 116, 138, 230] },
];
// Resistor body outline (bulged ends), viewBox 0 0 320 90.
const BODY = 'M80 19C62 19 56 30 56 45C56 60 62 71 80 71C92 71 96 63 108 63H212C224 63 228 71 240 71'
  + 'C258 71 264 60 264 45C264 30 258 19 240 19C228 19 224 27 212 27H108C96 27 92 19 80 19Z';

let mult = 1000;

const tidy = x => Number(x.toPrecision(12));  // 1.1 * 1e6 -> 1100000, not 1100000.0000000002
const ohms = R => R >= 1e6 ? `${tidy(R / 1e6)} MΩ` : R >= 1e3 ? `${tidy(R / 1e3)} kΩ` : `${tidy(R)} Ω`;

// Bands for R ohms with n significant digits: { digits, exp, shown }, or null if out of range.
// exp is the multiplier power of ten (-2 silver, -1 gold, 0..9 black..white).
function bands(R, n) {
  const s = R.toExponential(n - 1);  // 4700 -> "4.70e+3"
  const [m, e] = s.split('e');
  const exp = +e - (n - 1);
  if (exp < -2 || exp > 9) return null;
  return { digits: [...m.replace('.', '')].map(Number), exp, shown: Number(s) };
}

function drawing(t, colors) {
  const id = 'r' + t.n;
  return `<svg viewBox="0 0 320 90" role="img" aria-label="${colors.map(c => c[0]).join(', ')}">
    <defs>
      <clipPath id="${id}c"><path d="${BODY}"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity=".3"/>
        <stop offset=".3" stop-color="#fff" stop-opacity=".35"/>
        <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity=".35"/>
      </linearGradient>
    </defs>
    <rect x="0" y="42" width="320" height="6" rx="3" fill="#a3a9b0"/>
    <path d="${BODY}" fill="${t.body}"/>
    <g clip-path="url(#${id}c)">${colors.map((c, i) =>
      `<rect x="${t.x[i]}" y="0" width="12" height="90" fill="${c[1]}"/>`).join('')}</g>
    <path d="${BODY}" fill="url(#${id}g)"/>
  </svg>`;
}

// All markup below is built from the constants above and numbers, never from typed text.
function card(t, R) {
  const c = document.createElement('section');
  c.className = 'rcard';
  c.innerHTML = `<h2>${t.name} <small>${t.kind}, ${t.tolText}</small></h2>`;
  const b = bands(R, t.n);
  if (!b) {
    c.insertAdjacentHTML('beforeend', `<p class="warn">Too ${R < 1 ? 'small' : 'large'} for a ${t.name} resistor.</p>`);
    return c;
  }
  const colors = [...b.digits.map(d => DIGIT[d]), b.exp >= 0 ? DIGIT[b.exp] : b.exp === -1 ? GOLD : SILVER, t.tol];
  const values = [...b.digits, TIMES[b.exp + 2], t.tolText];
  // One box per band, left to right like the picture: filled with the band color, name written inside.
  c.insertAdjacentHTML('beforeend', drawing(t, colors)
    + `<ol class="bands" aria-label="Bands, left to right" style="grid-template-columns:repeat(${colors.length},minmax(0,1fr))">`
    + colors.map(([name, fill, ink], i) =>
      `<li style="background:${fill};color:${ink}"><b>${name}</b>${values[i]}</li>`).join('')
    + '</ol>');
  if (b.shown !== R) {
    c.insertAdjacentHTML('beforeend',
      `<p class="warn">A ${t.name} resistor can't show ${ohms(R)} exactly. These bands read ${ohms(b.shown)}.</p>`);
  }
  return c;
}

function updateResistor() {
  const raw = $('rv').value.trim();
  const v = parseFloat(raw.replace(',', '.'));
  const status = $('r-status'), out = $('r-cards');
  out.replaceChildren();
  status.className = 'status';
  if (!raw) { status.textContent = 'Type a value, then pick Ω, kΩ or MΩ.'; return; }
  if (!(v > 0 && isFinite(v))) { status.textContent = 'Enter a number above 0.'; return; }
  const R = tidy(v * mult);
  status.className = 'rvalue';
  status.textContent = ohms(R);
  if (R >= 1000) status.append(Object.assign(document.createElement('small'), { textContent: `= ${R.toLocaleString('en')} Ω` }));
  out.append(...TYPES.map(t => card(t, R)));
}

document.querySelectorAll('.unit').forEach(btn => btn.addEventListener('click', () => {
  mult = +btn.dataset.mult;
  document.querySelectorAll('.unit').forEach(u => u.setAttribute('aria-pressed', u === btn));
  updateResistor();
}));
$('rv').addEventListener('input', updateResistor);
$('rv').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });  // hide iPhone keyboard
updateResistor();
