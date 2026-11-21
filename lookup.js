'use strict';
// Lookup tab: search any item online. Free and keyless:
// - Wikipedia and Wikimedia Commons allow browser requests (origin=*), shown inside the app.
// - Google / Images / Datasheet buttons open the search in Safari, for anything Wikipedia lacks.
// Loaded after app.js (uses its $ and el helpers).

const LINKS = [
  ['Google', q => `https://www.google.com/search?q=${q}`],
  ['Images', q => `https://www.google.com/search?tbm=isch&q=${q}`],
  ['Datasheet', q => `https://www.alldatasheet.com/view.jsp?Searchword=${q}`],
];
let lookSeq = 0;  // ignore answers to an older search that arrive late

// Search one wiki; returns its result pages in rank order.
function wikiSearch(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'search', ...params });
  return fetch(url)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index));
}

function outLink(href, ...children) {
  const a = el('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.append(...children);
  return a;
}

async function lookup(e) {
  e.preventDefault();
  const q = $('lq').value.trim();
  $('lq').blur();  // hide iPhone keyboard
  if (!q) return;
  const my = ++lookSeq;
  const status = $('l-status'), wiki = $('l-wiki'), pics = $('l-pics');
  const enc = encodeURIComponent(q);
  $('l-links').replaceChildren(...LINKS.map(([name, url]) => {
    const a = outLink(url(enc), name);
    a.setAttribute('aria-label', `${name}: search for ${q} (opens Safari)`);
    return a;
  }));
  $('l-links').hidden = false;
  wiki.replaceChildren();
  pics.replaceChildren();
  $('l-pics-h').hidden = true;
  status.textContent = 'Searching…';

  try {
    const [pages, files] = await Promise.all([
      wikiSearch('en.wikipedia.org', {
        gsrsearch: q, gsrlimit: 3, prop: 'pageimages|extracts',
        exintro: 1, explaintext: 1, exsentences: 2, exlimit: 3, piprop: 'thumbnail', pithumbsize: 250 }),
      wikiSearch('commons.wikimedia.org', {
        gsrsearch: q, gsrnamespace: 6, gsrlimit: 12, prop: 'imageinfo', iiprop: 'url|mime', iiurlwidth: 330 }),
    ]);
    if (my !== lookSeq) return;

    for (const p of pages) {
      const text = el('span');
      text.append(el('b', '', p.title), el('small', '', p.extract || ''));
      const img = p.thumbnail ? Object.assign(el('img'), { src: p.thumbnail.source, alt: '', loading: 'lazy' }) : '';
      wiki.append(Object.assign(outLink(`https://en.wikipedia.org/?curid=${p.pageid}`, img, text), { className: 'wcard' }));
    }
    const images = files.filter(f => f.imageinfo?.[0]?.mime?.startsWith('image/')).slice(0, 9);
    for (const f of images) {
      const img = Object.assign(el('img'), {
        src: f.imageinfo[0].thumburl, alt: f.title.replace(/^File:|\.\w+$/g, ''), loading: 'lazy' });
      pics.append(outLink(`https://commons.wikimedia.org/?curid=${f.pageid}`, img));
    }
    $('l-pics-h').hidden = !images.length;
    status.textContent = pages.length || images.length
      ? `From Wikipedia for "${q}". Tap to open.`
      : `Wikipedia has nothing on "${q}". Try the buttons above.`;
  } catch {
    if (my !== lookSeq) return;
    status.textContent = navigator.onLine === false
      ? "You're offline. Lookup needs internet. The Parts and Resistors tabs still work."
      : "Couldn't reach Wikipedia. Try again, or use the buttons above.";
  }
}

$('look-bar').addEventListener('submit', lookup);
