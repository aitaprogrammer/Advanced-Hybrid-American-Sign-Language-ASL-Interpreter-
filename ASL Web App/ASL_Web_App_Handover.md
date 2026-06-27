# ASL Interpreter Web App — Complete Technical Handover

## Project Location
```
d:\d\Khizar\ITU\Semester\Eigth Semester\FYP\Web\
```

---

## 1. What the App Does

A fully **client-side, real-time ASL (American Sign Language) interpreter** that runs
entirely in the browser — no backend, no server, no cloud API.

- Opens the device camera
- Detects the user's hand in real time using MediaPipe
- Extracts 21 hand landmarks (x, y coordinates)
- Normalises those landmarks to match training scale
- Runs a trained Random Forest model (exported as JavaScript)
- Displays the predicted ASL letter/digit with confidence %
- Lets the user press "Add Letter" to build sentences
- Speaks the sentence via the browser's Web Speech API (TTS)

**38 classes:** A–Z (26 letters), 0–9 (10 digits), space, full stop.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite (v8) |
| Hand detection | Google MediaPipe Tasks Vision (CDN) |
| ML model | Random Forest → exported as plain JS |
| Styling | Vanilla CSS (no Tailwind, no UI library) |
| Auth | localStorage (no backend) |
| TTS | Browser Web Speech API |
| Glove hardware | Seeed Studio XIAO nRF52840 — BLE HID Keyboard mode |
| Glove input method | `window.addEventListener('keydown', …)` — native OS keystroke capture |
| Deployment | Netlify (static hosting) |

---

## 3. Full File Structure & What Each File Does

```
Web/
├── netlify.toml                     ← Netlify deploy config
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                     ← React root, mounts <App/>
    ├── App.tsx                      ← Top-level router (auth screens → Dashboard)
    ├── index.css                    ← ALL styles (design tokens + layout + responsive)
    ├── App.css                      ← Legacy (mostly unused, kept for safety)
    │
    ├── hooks/
    │   ├── useMediaPipe.ts          ← Camera + MediaPipe detection loop + skeleton draw
    │   └── useASLModel.ts           ← Model loading + landmark normalisation + predict()
    │
    ├── utils/
    │   ├── asl_model.js             ← THE TRAINED MODEL (2.9 MB plain JS, replace to update)
    │   ├── labels.ts                ← 38-class label array [A..Z, 0..9, ' ', '.']
    │   └── auth.ts                  ← localStorage login/signup/logout helpers
    │
    ├── components/
    │   ├── ConfidenceBar.tsx        ← Reusable progress bar for confidence %
    │   └── SentenceBuilder.tsx      ← Text area + Speak + Clear + Backspace buttons
    │
    └── screens/
        ├── Splash.tsx               ← 2.5s animated splash, auto-navigates
        ├── Login.tsx                ← Email + password login form
        ├── Signup.tsx               ← Name + email + password signup form
        ├── Dashboard.tsx            ← MAIN SCREEN — persistent camera, all 4 tabs
        ├── CameraMode.tsx           ← Standalone camera screen (legacy, not used in nav)
        ├── HybridMode.tsx           ← Standalone hybrid screen (legacy, not used in nav)
        ├── GloveMode.tsx            ← Glove screen (legacy)
        ├── Home.tsx                 ← Old home screen (legacy, not used)
        └── Profile.tsx              ← Old profile screen (legacy, not used)
```

> **Note:** CameraMode, HybridMode, GloveMode, Home, Profile are legacy files from the
> original mobile-nav design. They are compiled but NOT rendered anywhere in the current app.
> All functionality lives inside Dashboard.tsx. They were kept to avoid breaking the build
> and were updated to use the new API so TypeScript doesn't error.

---

## 4. App.tsx — The Router

**Path:** `src/App.tsx`

```tsx
type Screen = 'splash' | 'login' | 'signup' | 'app';
```

Controls which screen is shown:
1. Always starts at `'splash'`
2. Splash auto-navigates → `'login'` (or `'app'` if already logged in via localStorage)
3. Login → `'app'` on success, or → `'signup'`
4. Signup → `'app'`

**KEY ARCHITECTURAL DECISION:** The `<Dashboard/>` component is rendered with
`display:none` while auth screens are shown — it is **never unmounted**. This keeps the
MediaPipe `HandLandmarker` and camera stream alive from first login, avoiding the 2–3s
re-init cost every time the user navigates.

```tsx
<div style={{ display: screen === 'app' ? 'contents' : 'none' }}>
  <Dashboard onLogout={() => setScreen('login')} />
</div>
```

---

## 5. Dashboard.tsx — The Heart of the App

**Path:** `src/screens/Dashboard.tsx`

This single component handles everything after login. It has 4 tabs:
- **Camera Mode** — live camera + prediction + sentence builder
- **Glove Mode** — simulated BLE glove (placeholder for real hardware)
- **Hybrid Mode** — camera + simulated glove confidence combined
- **Profile** — user info + sign-out

### Layout
- **Desktop (>1100px):** 220px sticky sidebar + two-column main area (3fr camera / 2fr controls)
- **Tablet (641–1100px):** Icon-only collapsed sidebar (64px)
- **Mobile (≤640px):** Sidebar hidden → fixed bottom navigation bar with 4 tabs

### State managed inside Dashboard
```ts
const [tab, setTab]           // active tab: 'camera'|'glove'|'hybrid'|'profile'
const [predLabel, setPredLabel] // current predicted letter e.g. 'A', '5', ' '
const [predConf, setPredConf]   // confidence 0.0 – 1.0
const [sentence, setSentence]   // sentence being built
// glove simulation state
const [gloveLabel, gloveConf, gloveConn, gloveSentence, ...]
```

### Camera never unmounts
The `<video>` and `<canvas>` elements are always in the DOM. Switching tabs only hides/
shows panels via conditional rendering of the RIGHT column — the camera feed on the left
stays live at all times.

### Inference callback
```ts
const onLandmarks = useCallback(async (lms) => {
  const video = videoRef.current;
  const vw = video?.videoWidth  || 640;
  const vh = video?.videoHeight || 480;
  const pred = await predict(lms, vw, vh);  // ← passes video dims for correct scaling
  setPredLabel(pred.label);
  setPredConf(pred.confidence);
}, [videoRef]);
```

The callback is registered/deregistered based on the active tab:
```ts
useEffect(() => {
  if (tab === 'camera' || tab === 'hybrid') setOnLandmarks(onLandmarks);
  else setOnLandmarks(null);
}, [tab, onLandmarks, setOnLandmarks]);
```

### Auto-add was REMOVED
Originally the app auto-added a letter after holding for 1.2 seconds. This was removed
by request. Now the user must press the **"✚ Add Letter"** button manually.

---

## 6. useMediaPipe.ts — Detection Engine

**Path:** `src/hooks/useMediaPipe.ts`

### What it does
1. Loads `HandLandmarker` from MediaPipe CDN (once, on mount)
2. Opens camera via `navigator.mediaDevices.getUserMedia`
3. Runs a `requestAnimationFrame` loop calling `hl.detectForVideo(video, timestamp)`
4. Draws the hand skeleton on the canvas overlay
5. Fires the `onLandmarks` callback synchronously every frame with the 21 landmarks

### Skeleton drawing
```ts
function drawHand(ctx, lms, w, h) {
  // Draws connections (cyan lines) between the 21 landmark pairs
  // Draws dots at each landmark (indigo circles, larger orange dot at wrist)
  // Coordinates: lms[i].x * w,  lms[i].y * h
}
```

### Canvas sizing
```ts
if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
}
```
Canvas is always sized to the **native stream resolution** (not CSS display size).
Both `<video>` and `<canvas>` are CSS-mirrored with `transform: scaleX(-1)` so the
selfie view is natural. Since both are mirrored identically, the skeleton aligns perfectly.

### Camera settings
```ts
video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
```

### Exported API
```ts
{
  videoRef, canvasRef, landmarksRef,
  isReady, isRunning, error,
  startCamera, stopCamera, setOnLandmarks
}
```

`setOnLandmarks(callback)` — registers a function that gets called every frame.
Pass `null` to deregister (stops inference without stopping camera).

---

## 7. useASLModel.ts — Model Integration & Preprocessing

**Path:** `src/hooks/useASLModel.ts`

### Model loading
```ts
const raw = await import('../utils/asl_model.js?raw');
// Loads the 2.9 MB JS file as a raw string (Vite ?raw suffix)

const fn = new Function(`${src}; return score;`)();
// Extracts the score() function from the raw string
```
This works because `asl_model.js` is plain JS with no exports — just:
`function score(input) { ... return probabilities; }`

Model is loaded eagerly on first import and cached in a module-level variable.
A diagnostic check detects placeholder vs real model and logs to console.

### THE CRITICAL PREPROCESSING FIX

**Problem:** Training used cvzone which returns **raw pixel coordinates** (0–640).
Browser MediaPipe returns **normalised coordinates** (0–1).
Feeding 0–1 values into a model trained on 0–640 values = wrong predictions.

**Wrong (what was there before):**
```ts
result.push((p.x - minX) * 255);  // ← arbitrary constant, still wrong scale
result.push((p.y - minY) * 255);
```

**Correct (current implementation):**
```ts
export function normalizeLandmarks(landmarks, videoWidth = 640, videoHeight = 480) {
  // Step 1: Convert normalised [0,1] → pixel coordinates (matches cvzone output)
  const xPx = landmarks.map(p => p.x * videoWidth);
  const yPx = landmarks.map(p => p.y * videoHeight);

  // Step 2: Subtract minimum (the ONLY normalisation used during training)
  const minX = Math.min(...xPx);
  const minY = Math.min(...yPx);

  const result = [];
  for (let i = 0; i < landmarks.length; i++) {
    result.push(xPx[i] - minX);
    result.push(yPx[i] - minY);
  }
  return result;  // 42 values, range ≈ 0–250
}
```

**Why multiply by videoWidth/Height and not 255?**
Because cvzone scales by the actual camera frame width (usually 640). If you multiply by
255 (not 640), the values end up in range 0–102 instead of 0–250. The Random Forest's
decision thresholds are calibrated to the 0–250 range so the wrong scale causes
misclassification — especially for digits which have subtle shape differences.

### Debug mode
In the browser console, run: `window.__ASL_DEBUG = true`
This logs the 42 input values + top-5 predictions once per second while signing.
Input max should be between 50–250. If it's 0–1, video dimensions aren't being read.

---

## 8. labels.ts — Class Label Array

**Path:** `src/utils/labels.ts`

```ts
export const LABELS: string[] = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',   // indices 0–12
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',   // indices 13–25
  '0','1','2','3','4','5','6','7','8','9',' ','.'        // indices 26–37
];
```

**This order is critical** — it must match exactly the class order used during training.
The model's `score()` function returns 38 probabilities in this same order.
Index of the max probability = the predicted class.

---

## 9. asl_model.js — The Trained Model

**Path:** `src/utils/asl_model.js`

- **Size:** ~2.9 MB (plain JS) → ~100 KB gzip compressed
- **Type:** Random Forest classifier exported as JavaScript
- **Function:** `score(input)` — takes 42-element array, returns 38-element probability array
- **Training:** scikit-learn Python, 5,478 samples, 38 classes, ~99% cross-validation accuracy
- **Data collection:** cvzone HandDetector on webcam, raw pixel coordinates

**To update the model:**
1. Retrain in Python with scikit-learn
2. Export using the serialisation script (walks each decision tree, generates JS conditionals)
3. Replace `src/utils/asl_model.js` with the new file
4. Run `npm run build` — no other code changes needed

The model auto-detects as 'real' vs 'placeholder' based on source content and logs to console.

---

## 10. auth.ts — Authentication

**Path:** `src/utils/auth.ts`

Stores users in `localStorage` under key `asl_users` as a JSON array.
Session stored under `asl_current_user`.

```ts
loginUser(email, password)   // returns user object or null
signupUser(name, email, pass) // returns user object or throws
logoutUser()                  // clears current session
getCurrentUser()             // returns current user or null
isLoggedIn()                 // boolean
```

No real backend — this is purely for the FYP demo. All data is in the browser's localStorage.

---

## 11. index.css — All Styles

**Path:** `src/index.css`

Single CSS file, no preprocessor. Organised into sections:

1. **Google Fonts import** — Inter (weights 300–900)
2. **CSS Custom Properties (:root)** — all design tokens
3. **Base reset** — box-sizing, body, #root
4. **Auth screen** — `.screen`, `.screen::before` (gradient background)
5. **Cards** — `.card`
6. **Buttons** — `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-tts`, `.btn-sm`
7. **Form inputs** — `.input-field`, `.input-with-icon`, `.input-label`
8. **Camera elements** — `.camera-container`, `.camera-video`, `.camera-canvas`, `.camera-overlay-badge`
9. **Prediction letter** — `.prediction-letter` (gradient text)
10. **Confidence bar** — `.confidence-track`, `.confidence-fill`
11. **Sentence box** — `.sentence-box`, `.sentence-cursor`
12. **Dashboard layout** — `.dashboard-root`, `.sidebar`, `.sidebar-nav-item`, `.dashboard-main`, `.dash-topbar`, `.dash-body`
13. **Two-column layout** — `.two-col-layout`, `.col-camera`, `.col-controls`
14. **Prediction card** — `.prediction-card`, `.section-label`, `.action-row`
15. **Misc helpers** — `.hint-box`, `.loading-bar`, `.loading-spinner`, `.glove-status-bar`, `.live-badge`
16. **Responsive breakpoints:**
    - `@media (max-width: 1100px)` — sidebar collapses to icons
    - `@media (max-width: 640px)` — sidebar hidden, mobile bottom nav shown

### Colour Palette (CSS Variables)
```css
--bg-primary:   #F0F4FF    /* lavender-white page background */
--bg-card:      #FFFFFF    /* white cards */
--text-primary: #111827    /* dark charcoal */
--text-muted:   #6B7280    /* medium gray */
--indigo:       #4F46E5    /* primary brand */
--purple:       #7C3AED    /* secondary / glove */
--cyan:         #0EA5E9    /* camera accent (sky blue) */
--orange:       #F97316    /* hybrid accent */
--green:        #16A34A    /* success / live status */
--red:          #DC2626    /* danger / stop */
--border:       rgba(79,70,229,0.13)
--border-input: #E5E7EB
```

---

## 12. Mobile Responsive Navigation

On screens ≤640px the sidebar is `display:none`. A fixed bottom nav bar appears:

```tsx
<nav className="mobile-bottom-nav">
  { ['camera','glove','hybrid','profile'].map(tab => (
    <button className={`mobile-nav-item ${active ? 'active' : ''}`}>
      <span className="mobile-nav-icon">{icon}</span>
      <span className="mobile-nav-label">{label}</span>
    </button>
  ))}
</nav>
```

CSS: `position: fixed; bottom: 0;` with `padding-bottom: env(safe-area-inset-bottom)`
for iOS notch support. The `.dash-body` gets `padding-bottom: calc(68px + safe-area-inset)`
so content never hides behind the nav bar.

---

## 13. netlify.toml — Deployment Config

**Path:** `Web/netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

The `[[redirects]]` rule is mandatory — without it, refreshing any page on Netlify gives
a 404 because the server doesn't know about client-side routes.

**To deploy:**
- Option A (drag & drop): Run `npm run build`, drag the `dist/` folder to app.netlify.com
- Option B (Git auto-deploy): Push to GitHub, connect repo in Netlify, it reads netlify.toml

---

## 14. Components

### ConfidenceBar.tsx
**Path:** `src/components/ConfidenceBar.tsx`

Reusable horizontal bar showing confidence percentage.
Props: `{ label: string, value: number (0–1), variant?: 'cyan'|'indigo'|'green'|'orange' }`

### SentenceBuilder.tsx
**Path:** `src/components/SentenceBuilder.tsx`

Shows the built sentence with a blinking cursor + Speak / Clear / Backspace buttons.
Props: `{ sentence, onSpeak, onClear, onBackspace }`

---

## 15. Key Decisions & Why

| Decision | Reason |
|---|---|
| Dashboard never unmounts | MediaPipe init takes 2–3s; keeping it alive avoids reload lag |
| `setOnLandmarks` callback ref pattern | Avoids stale closures in RAF loop; zero-lag inference |
| `?raw` import + `new Function()` | asl_model.js has no exports; only way to load it in Vite |
| `× videoWidth` not `× 255` | Training used cvzone pixel coords (0–640); 255 is wrong scale |
| Mirror x-coords in `normalizeLandmarks` | Training used `cv2.flip(frame,1)`; browser MediaPipe is unmirrored |
| No auto-add timer | Removed by user request — only manual "Add Letter" button |
| Glove via `keydown` not Web Bluetooth | Glove is a BLE HID Keyboard; OS handles pairing, app just reads keystrokes |
| `tabRef` pattern in keydown listener | Mounted once at startup; ref keeps it gate-checked to Glove Mode only |
| Vanilla CSS, no Tailwind | Full control, no class bloat, easier to maintain single file |
| localStorage auth | FYP demo only — no real backend needed |

---

## 16. Known Issues / Future Work

1. **Model accuracy on digits** — The preprocessing fix (× videoWidth) corrected the
   scale mismatch. If digits are still occasionally wrong, retraining with more digit samples
   is the next step.

2. **Glove Mode is real hardware** — The Seeed XIAO nRF52840 glove is configured as a BLE HID
   Keyboard. It runs a Decision Tree on-device and types the predicted letter via Bluetooth.
   The app uses a global `window.addEventListener('keydown', …)` to capture these keystrokes
   — no Web Bluetooth API needed. Pair via native OS Bluetooth settings; the app picks up
   keystrokes automatically when the Glove Mode tab is active.

3. **MediaPipe loads from CDN** — If offline, the app fails to detect hands. To make it
   work offline, the MediaPipe WASM files and model task file need to be bundled locally.
4. **Handedness fix** — Mirrored x‑coordinates in `normalizeLandmarks` to match the Python training pipeline (which used `cv2.flip(frame, 1)`), fixing right‑hand predictions.
5. **asl_model.js bundle size** — 2.9 MB uncompressed. Netlify serves it gzip-compressed
   (~100 KB). If load time is a concern, the model could be lazy-loaded after the camera
   starts.

5. **Single hand only** — `numHands: 1` in HandLandmarker config. Two-hand signs are
   not supported by the current model.

---

## 17. How to Run Locally

```bash
cd "d:\d\Khizar\ITU\Semester\Eigth Semester\FYP\Web"
npm install
npm run dev
# opens at http://localhost:5173
```

**To build for production:**
```bash
npm run build
# output in dist/ folder
```

---

## 18. How to Update the Model

1. Retrain in Python (scikit-learn RandomForest, 42 input features, 38 classes)
2. Export using the JS serialisation script
3. Copy new file to: `src/utils/asl_model.js`
4. No other code changes needed
5. Run `npm run build` and redeploy

The label order in `src/utils/labels.ts` **must match** the training class order:
`[A..Z, 0..9, space, period]` — if the training script uses a different order,
update `labels.ts` to match.
