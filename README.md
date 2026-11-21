# Priyankara Radio: Parts finder

Find which drawer a component is in. Works offline on iPhone
(Safari > Share > Add to Home Screen).

## Data

`parts.json` holds every cabinet, drawer and part.
Column 1 is on the left as you face the cabinet; row 1 is the top.

## Run locally

py -m http.server 8000, then open http://localhost:8000

## Update the parts list

Edit `parts.json`, then commit and push. Open the app once online to refresh.
