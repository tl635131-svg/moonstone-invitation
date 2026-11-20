# Moonstone — Sinhala Buddhist Poruwa wedding invitation (demo)

Demo invitation for a fictional couple (Nethmi & Kavindu, Kandy, 13 February 2027).
English + Sinhala (tap the EN / සිං pill). All artwork generated with Codex CLI.

## Open it
Double-click `index.html`, or serve the folder:

    python -m http.server 5190

then open http://127.0.0.1:5190 on a phone-sized window.

## What's inside
- Silk envelope with jasmine garland and gold lotus wax seal — tap: garland slides off, seal pops, flap lifts in 3D, card rises
- Hero with Kandyan gold corners and a brass lamp whose five wicks light up
- Families, live countdown under a carved moonstone, Subha Nekatha (Poruwa 9.41 a.m., facing East, white)
- Ceremony (map + .ics calendar), Poruwa customs, our story, scratch-to-reveal photo
- Timeline, homecoming, dress code, transport, hotels, gift flip card (copy bank details), RSVP form
- Music generated live in the browser (no audio file), drifting jasmine petals, reduced-motion support

## Reuse for a real couple
Edit `js/data.js` (names, dates, venues, hotels, all English + Sinhala text). The RSVP is demo-only
(saved in the browser) — connect `fetch()` to your backend in `js/app.js` before using it for real.
Have a native speaker proofread the Sinhala copy.
