# Coach Position Tool — Project Context for Claude Code

## The problem
SWR Davangere Division staff (announcers, TTEs, porters) currently get train
coach position charts via WhatsApp — many groups, many images, hard to find
the right train fast. Three different source formats already exist with no
single standard:
1. Official "Vehicle Guidance" printed sheets (detailed, from Dy.SS/control office)
2. "Coach Consist" app screenshots (an existing internal live system, but only
   some staff have access, so others screenshot and forward it)
3. Handwritten shorthand notes station staff make themselves for quick reference

## The goal
A simple shared web app: type a train number, get a standardized coach-position
list instantly. Replaces hunting through WhatsApp images.

## Key decisions already made
- **Platform**: Web app / PWA (shareable link, no install needed) — not a native
  Android app, to avoid Play Store friction (had billing issues before).
- **Entry format**: Compressed shorthand in ONE text field, e.g.
  `ENG,LPR,2GEN,HA1,A1,B1-B3,PC,S1-S7,GEN,SLRD` — matches the shorthand staff
  already write by hand. NOT a one-row-per-coach form.
- **Identity**: Simple name + phone number typed once, stored in localStorage.
  No OTP, no verification — this is a trusted internal pilot, not a public app.
  Every submission is stamped with who entered it and when, for accountability.
- **Backend**: Firebase Firestore (no Auth needed since no OTP). One document
  per train+date: `trains/{trainNo}_{date}`.
- **Scope**: Pilot with a few key trains first, not full division rollout yet.

## IMPORTANT — lessons from a previous failed attempt
Lohit had already built a more elaborate version of this (screenshots shown:
Board/Submit/More tabs, drag-to-reorder coach rows, Speed Add buttons, a
photo-scan/OCR feature, "Apply last config", "Share as image", confidence
badges). When asked what went wrong, the answer was: **all of it**:
- OCR/photo scan gave wrong results (handwritten shorthand is genuinely hard
  to scan reliably)
- Entering coaches one-by-one (one row per coach) was too slow
- Staff didn't actually use it
- App had bugs/crashes
- Too many screens/options, confusing

**Do not reintroduce OCR, photo scan, drag-reorder, or multi-screen flows
without being asked.** The current rebuild deliberately strips this back to
3 screens (search/result, submit, legend) and one compressed-text field. If
asked to add features, push back on anything that adds a screen or a step
unless there's a clear reason it solves a real problem this time.

Two ideas from the old build are good and worth adding *later*, once the
simplified version is proven to actually get used:
- "Share as image" — export the result as an image to forward back into
  the existing WhatsApp groups, meeting staff halfway
- "Apply last config" — reuse a train's previous-day composition with one
  tap, since many trains repeat the same rake day to day

## Current build status
Files already created (in this folder):
- `index.html` — full app: search/result screen, submit bottom-sheet, legend
  bottom-sheet, identity bottom-sheet. Firebase Firestore via CDN modules.
  `firebaseConfig` in the script tag is still a placeholder.
- `manifest.json`, `icon.svg`, `sw.js` — PWA installability + offline app shell
- `SETUP.md` — step-by-step Firebase project creation, security rules, and
  Netlify deploy instructions

**NOT YET DONE**: Firebase project hasn't been created yet, app hasn't been
deployed or tested on a real device, no real staff have tried it.

## Standard coach code reference (already encoded in the app's legend + parser)
`ENG` engine · `LPR`/`VP` luggage/pilot van · `PWR` power car · `GEN` general/
unreserved · `D1-D4` second seating (2S) · `C1-C14` chair car (CC) · `HA1`
composite 1A+2A · `A1,A2...` AC 2-tier · `B1-B5...` AC 3-tier · `M1,M2` AC
3-tier economy · `PC` pantry car · `S1-S10...` sleeper · `SLRD`/`LSLRD` guard
cum Divyangjan coach.

Note: real coach compositions are NOT fixed templates — the same train number
can have different coach order on different days depending on which physical
rake is assigned, and extra coaches get added at intermediate stations. This
is why the tool needs fresh entry per train+date rather than a hardcoded list.

## Next steps
1. Create the Firebase project and Firestore database (see SETUP.md)
2. Paste the real `firebaseConfig` into `index.html`
3. Deploy to Netlify (same drag-and-drop flow as quickcashtools.netlify.app)
4. Test end-to-end on a real phone: set identity, submit a train, look it up
   on a second device
5. Pilot with 2-3 trusted staff on a couple of real trains before wider rollout
6. Only after the simplified version is actually being used: consider adding
   "Share as image" and "Apply last config" from the old build
