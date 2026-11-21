# Priyankara Radio: Parts finder

Find which drawer a component is in. Works offline on iPhone
(Safari > Share > Add to Home Screen).

## Data

`parts.json` holds every cabinet, drawer and part.
Column 1 is on the left as you face the cabinet; row 1 is the top.

## Files

Plain HTML/CSS/JS. No build step, no frameworks, nothing loaded from the internet.

| File | What it does |
|------|--------------|
| `index.html` | The page: sticky search box, results list, cabinet view, drawer sheet. iPhone home-screen tags. |
| `styles.css` | Layout and the cabinet drawing. Light and dark mode, safe-area insets, reduced motion. |
| `app.js` | Loads `parts.json`, searches, draws the cabinet and opens the drawer sheet. Switches between the Parts and Resistors tabs. |
| `resistor.js` | Resistors tab: type a value, pick Ω / kΩ / MΩ, see the 4-band and 5-band color code. |
| `sw.js` | Service worker. Precaches every file; network first, cache when offline. |
| `manifest.webmanifest` | Home-screen app settings (name, icons, standalone). |
| `icon-180.png`, `icon-192.png`, `icon-512.png` | App icon (180 is the iPhone home-screen icon). |

Search ignores case, spaces, dashes and dots, and treats `2SD1402` and `D1402`
as the same part (a leading `2S` before A/B/C/D/J/K and a digit is dropped).

## Run locally

py -m http.server 8000, then open http://localhost:8000

## Update the parts list

Edit `parts.json`, then commit and push. Open the app once online to refresh.

If you add, rename or remove a file, update the list in `sw.js` and bump
the version in its cache name (for example `parts-finder-v2` -> `parts-finder-v3`).
