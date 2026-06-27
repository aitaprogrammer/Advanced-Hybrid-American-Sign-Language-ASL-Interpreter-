# ASL Interpreter – Web App

A **fully client-side** American Sign Language interpreter built with React + TypeScript + MediaPipe Hands.

## ⚡ Quick Start

### 1. Place the model file

> **IMPORTANT** – The `asl_model.js` file was originally provided separately. Copy it to:
> ```
> src/utils/asl_model.js
> ```
> This file must contain a plain JS function: `function score(input) { ... }`

### 2. Install dependencies
```bash
npm install
```

### 3. Run in development
```bash
npm run dev
```
Open http://localhost:5173 in your browser. **Allow camera access when prompted.**

### 4. Build for production
```bash
npm run build
```
Output goes to `dist/` — deploy as a static site (GitHub Pages, Vercel, Netlify).

---

## 🏗 Project Structure

```
src/
  hooks/
    useMediaPipe.ts     ← MediaPipe Hands detection loop + canvas drawing
    useASLModel.ts      ← Loads asl_model.js, normalizes landmarks, runs inference
  screens/
    Splash.tsx          ← 2.5s splash → auto-nav to Login/Home
    Login.tsx           ← Email + password login
    Signup.tsx          ← Registration with validation
    Home.tsx            ← Three mode cards
    CameraMode.tsx      ← Live camera + full ASL inference pipeline ✅
    GloveMode.tsx       ← Simulated BLE glove (mock predictions)
    HybridMode.tsx      ← Camera inference + simulated glove confidence
    Profile.tsx         ← User info + logout
  components/
    ConfidenceBar.tsx   ← Animated progress bar
    SentenceBuilder.tsx ← Sentence display + TTS + Clear
  utils/
    labels.ts           ← 38-class label array [A-Z, 0-9, space, period]
    auth.ts             ← localStorage auth simulation
    asl_model.js        ← ⚠️ YOU MUST PLACE THIS FILE HERE
```

---

## 🔬 Inference Pipeline

1. **MediaPipe Hands** extracts 21 hand landmarks (x,y ∈ [0,1]) from each video frame.
2. **Normalization** (matches training):
   - Subtract `min(x)` from all x values
   - Subtract `min(y)` from all y values
   - Multiply by `255` → pixel scale
3. Flat array of **42 numbers** passed to `score(input)`.
4. Returns **38 probabilities** → argmax → class label.

```
Labels: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z 0 1 2 3 4 5 6 7 8 9 [space] [.]
Index:  0 1 2 3 4 5 6 7 8 9 ...                                                    36      37
```

## 🎮 Features

| Feature | Status |
|---|---|
| Splash → Login → Signup flow | ✅ |
| LocalStorage auth (no backend) | ✅ |
| Camera Mode with live inference | ✅ |
| Auto-add letter after 1.2s hold | ✅ |
| Sentence Builder + TTS | ✅ |
| Hand skeleton overlay on camera | ✅ |
| Glove Mode (simulated) | ✅ |
| Hybrid Mode (camera live + glove mock) | ✅ |
| Profile + Logout | ✅ |
| Responsive dark UI | ✅ |

## 🔒 Auth

Authentication is local-only (no backend). Credentials stored in `localStorage`. For production, replace `src/utils/auth.ts` with a real API.

## 🚀 Deployment

The app is fully static. After `npm run build`:
- **GitHub Pages**: push `dist/` contents to `gh-pages` branch
- **Vercel**: connect repo, set output dir to `dist`
- **Netlify**: drag-drop the `dist/` folder
