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
- **Backend**: Started with `localStorage` (one record per train+date, key
  `trainNo_date`) to get the search/save/colour flow working and testable
  immediately. Firebase Firestore sync across devices is the planned next
  phase, deferred until the local-only version is confirmed to work well —
  see `SETUP.md`.
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

Two ideas from the old build were flagged as good and worth adding *later*:
- "Share as image" — **done**. The result card renders to a PNG (via the
  `html2canvas` CDN script) and hands off to the native share sheet
  (`navigator.share`) so staff can forward it straight into the existing
  WhatsApp groups; falls back to a plain download if Web Share isn't
  available (e.g. desktop browsers).
- "Apply last config" — still deferred. Reuse a train's previous-day
  composition with one tap, since many trains repeat the same rake day to
  day.

Also added (requested directly, not from the old build), to address
trust/authenticity in the data itself: a lightweight **Confirm** action —
any staff member with an identity set can mark the currently-displayed
entry as checked against reality. This stores `{name, phone, station, at}`
in a `confirmations` array on the record (one entry per phone, latest
wins) and shows as "✓ Confirmed by X · time ago" under the "Updated by"
line. Saving a new version of a train always clears `confirmations` for
that record, since a re-submitted coach list is new data that hasn't been
checked yet. Each save also increments a per-record `updateCount`, shown
as "update #N", so staff can see at a glance how many times today's entry
has been touched.

## Current build status
Files already created (in this folder):
- `index.html` — full app: search/result screen, submit bottom-sheet, legend
  bottom-sheet, identity bottom-sheet. Storage is `localStorage` (see
  Backend above); Firebase is not wired in yet. Loads `html2canvas` from a
  CDN for the share-as-image feature.
- `manifest.json`, `icon.svg`, `sw.js` — PWA installability + offline app
  shell. `sw.js` serves HTML network-first so deploys show up without a
  stale cache, and caches static assets cache-first.
- `SETUP.md` — deploy notes and the local-storage test plan; Firebase
  project/security-rules steps are still there but marked as deferred.

Deployed and live (Netlify, auto-deploy from this repo's `coach-position`
folder) — see PR #1 for the preview links. Not yet piloted with real staff.

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
1. Confirm the live Netlify link works end-to-end on a real phone: set
   identity, submit a train, share it as an image into a WhatsApp group,
   close/reopen and confirm it's still there (local-only storage).
2. Pilot with 2-3 trusted staff on a couple of real trains before wider
   rollout.
3. Once the local-only version is confirmed to work well in practice:
   create the Firebase project and Firestore database (see SETUP.md),
   paste the real `firebaseConfig` into `index.html`, and swap
   `getTrainRecord`/`saveTrainRecord` over to it so entries sync across
   devices.
4. Remaining deferred idea from the old build: "Apply last config" (reuse
   a train's previous-day composition with one tap).
