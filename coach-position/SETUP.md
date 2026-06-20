# Coach Position Tool — Setup Guide

Phase 1 pilot. No login/OTP — staff type their name + phone once (stored on their own
device) and it gets stamped on whatever they submit. Anyone with the link can read
and write, which is fine for a pilot shared only inside trusted staff groups.

## 1. Create a Firebase project (free, no card needed for this)

1. Go to https://console.firebase.google.com → **Add project** → name it
   e.g. `coach-position-dvg` → finish the wizard (you can skip Google Analytics).
2. In the left sidebar: **Build → Firestore Database → Create database**
   - Choose **Start in production mode**
   - Pick location `asia-south1` (Mumbai) — closest to India
3. Go to **Firestore Database → Rules** tab, replace the contents with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trains/{docId} {
      allow read, write: if true;
    }
  }
}
```

   Click **Publish**.

   (This is open read/write — acceptable for an internal pilot link shared only
   in your staff groups. If you want to lock it down later, e.g. once it's rolled
   out wider, that's a quick follow-up change.)

4. Go to **Project settings** (gear icon, top left) → scroll to **Your apps** →
   click the **</>** (web) icon → register an app (no need to tick Firebase Hosting)
   → it will show you a `firebaseConfig` object like:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "coach-position-dvg.firebaseapp.com",
  projectId: "coach-position-dvg",
  storageBucket: "coach-position-dvg.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

## 2. Paste your config into the app

Open `index.html`, find this block near the bottom (inside the `<script>` tag):

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  ...
};
```

Replace it with the real values you copied from Firebase. Save the file.

## 3. Deploy (same as QuickCash Tools)

1. Go to https://app.netlify.com
2. Drag and drop the whole `coach-position` folder onto the deploy area
3. Netlify gives you a live link (e.g. `coachposition.netlify.app`) — that's
   what you share in the WhatsApp groups instead of images.

## 4. Test before rollout

- Open the link on your phone → it should ask for your name + number once
- Enter a train number that has no data yet → "Add coach position" →
  type something like `ENG,LPR,2GEN,HA1,A1,B1-B3,PC,S1-S7,GEN,SLRD` → Save
- It should show as colored blocks immediately, with your name + time stamped
- Open the same link on a second phone/browser, search the same train number,
  confirm it shows up

## Notes for the pilot

- One Firestore document per train+date, so the same train number on a
  different day doesn't clash with yesterday's data.
- "Add to Home Screen" from the browser menu makes it behave like an app icon,
  same as QuickCash.
- Once a train has been looked up once on a phone, it stays viewable offline
  (Firestore caches it locally).
- Free Firestore quota easily covers a pilot of a handful of trains and staff
  (50K reads / 20K writes per day, free, no card required). No cost concern at
  this scale.
