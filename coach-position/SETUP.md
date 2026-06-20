# Coach Position Tool — Setup Guide

Phase 1 pilot. No login/OTP — staff type their name + phone once (stored on their own
device) and it gets stamped on whatever they submit.

## Storage — currently local only

Right now train data is saved with `localStorage`, on the device that entered it.
This means **data does not sync between phones yet** — useful for testing the
search/save/colour flow immediately without setting up a backend, but not yet a
shared tool. Cloud sync (Firebase Firestore) is the planned next phase once the
local-only version is confirmed to work well; see "Next: cloud sync" below.

## Deploy

If your Netlify site is connected to this GitHub repo (it is, if you see deploy
preview comments on PRs), deployment is automatic: `netlify.toml` publishes the
`coach-position` folder directly, no build step. Just push to the branch and
Netlify deploys it — the live link is shown in the deploy preview comment on the
PR, or in your Netlify dashboard for the production branch.

If you're starting a fresh site instead:
1. Go to https://app.netlify.com
2. Drag and drop the whole `coach-position` folder onto the deploy area
3. Netlify gives you a live link (e.g. `coachposition.netlify.app`) — that's
   what you share in the WhatsApp groups instead of images.

## Test before rollout

- Open the link on your phone → it should ask for your name + number once
- Enter a train number that has no data yet → "Add coach position" →
  type something like `ENG,LPR,2GEN,HA1,A1,B1-B3,PC,S1-S7,GEN,SLRD` → Save
- It should show as colour-coded, numbered, wrapped blocks immediately, with
  your name + time stamped
- Close and reopen the app, search the same train number — it should still be
  there (read from localStorage)
- Note: a second phone/browser will NOT see this entry yet (local-only storage)

## Notes for the pilot

- One record per train+date (key `trainNo_date`), so the same train number on
  a different day doesn't clash with yesterday's data.
- "Add to Home Screen" from the browser menu makes it behave like an app icon,
  same as QuickCash.
- Works fully offline since there's no network dependency for data — it's all
  on-device.

## Next: cloud sync

Once the local-only version is confirmed to work well in practice, swap
`getTrainRecord`/`saveTrainRecord` in `index.html` for a Firebase Firestore
(or similar) backend so entries sync across staff devices. That earlier plan
(Firebase project setup, Firestore rules, `firebaseConfig`) still applies when
we get there — it's just deferred, not abandoned.
