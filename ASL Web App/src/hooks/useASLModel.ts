import { LABELS } from '../utils/labels';

export interface Prediction {
  label: string;
  confidence: number;
  index: number;
  scores: number[];
}

// ── Diagnostic flag ────────────────────────────────────────────────────────
// Enable in browser DevTools console: window.__ASL_DEBUG = true
// Logs input values + top-5 predictions once per second while signing.
declare global { interface Window { __ASL_DEBUG?: boolean; } }

// ── Model loader ───────────────────────────────────────────────────────────
let scoreFunc: ((input: number[]) => number[]) | null = null;
let loadPromise: Promise<(input: number[]) => number[]> | null = null;
let modelSource: 'placeholder' | 'real' | 'unknown' = 'unknown';

async function loadModel(): Promise<(input: number[]) => number[]> {
  if (scoreFunc) return scoreFunc;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Load asl_model.js as raw text then extract score() via Function().
    // The file has no ES exports — it is plain JS: function score(input) {...}
    const raw = await import('../utils/asl_model.js?raw');
    const src = typeof raw === 'string' ? raw : (raw as { default: string }).default;

    if (src.includes('PLACEHOLDER') || src.includes('Dummy')) {
      modelSource = 'placeholder';
      console.warn(
        '⚠️ [ASL] PLACEHOLDER model loaded!\n' +
        '   Replace src/utils/asl_model.js with the real trained model.'
      );
    } else {
      modelSource = 'real';
      const nodeCount = (src.match(/var var\d+/g) || []).length;
      console.info(`✅ [ASL] Real model loaded (${nodeCount} decision tree nodes).`);
    }

    // eslint-disable-next-line no-new-func
    const fn = new Function(`${src}; return score;`)() as (input: number[]) => number[];
    scoreFunc = fn;
    return fn;
  })();

  return loadPromise;
}

/**
 * Normalise 21 hand landmarks to match the training pipeline exactly.
 *
 * TRAINING PIPELINE (Python / cvzone):
 *   - cvzone returns landmarks in RAW PIXEL coordinates (e.g. 0–640 for a
 *     640-wide frame).  These are NOT normalised to 0–1.
 *   - The ONLY normalisation applied was:
 *       x_norm = x_pixel - min(x_pixels)
 *       y_norm = y_pixel - min(y_pixels)
 *   - No division, no ×255, no further scaling.
 *   - After this, feature values fall in the range ≈ 0–250 (the pixel span
 *     of a typical hand in a 640×480 frame).
 *
 * WEB PIPELINE (browser MediaPipe):
 *   - MediaPipe returns landmarks normalised to 0–1 (NOT pixel coordinates).
 *   - To replicate training we must first convert back to pixel space:
 *       x_pixel = landmark.x * videoWidth
 *       y_pixel = landmark.y * videoHeight
 *   - Then apply the same min-subtraction:
 *       x_norm = x_pixel - min(x_pixels)
 *       y_norm = y_pixel - min(y_pixels)
 *   - This gives the same 0–250 range as training — no arbitrary constant.
 *
 * @param landmarks  21 points with x,y in [0,1] (MediaPipe normalised)
 * @param videoWidth  Actual pixel width  of the video stream (default 640)
 * @param videoHeight Actual pixel height of the video stream (default 480)
 * @returns Flat array of 42 floats [x0,y0, x1,y1, …, x20,y20] in ≈ 0–250 range
 */
export function normalizeLandmarks(
  landmarks: Array<{ x: number; y: number }>,
  videoWidth  = 640,
  videoHeight = 480,
): number[] {
  // Step 1 — convert normalised [0,1] → pixel coordinates (matches cvzone output)
  const xPx = landmarks.map(p => p.x * videoWidth);
  const yPx = landmarks.map(p => p.y * videoHeight);

  // Step 2 — MIRROR x-coordinates to match the Python training pipeline.
  // Training used cv2.flip(frame, 1) which mirrors horizontally, so the model
  // expects landmarks from a mirrored view (right hand = right side of frame).
  // Browser MediaPipe gives non-mirrored coordinates, so we flip x here:
  //   x_mirrored = videoWidth - x_pixel
  const xPxMirrored = xPx.map(x => videoWidth - x);

  // Step 3 — subtract minimum (the ONLY normalisation used during training)
  const minX = Math.min(...xPxMirrored);
  const minY = Math.min(...yPx);

  const result: number[] = [];
  for (let i = 0; i < landmarks.length; i++) {
    result.push(xPxMirrored[i] - minX);
    result.push(yPx[i] - minY);
  }
  return result;
}

// Throttle debug logging to once per second
let lastDebugLog = 0;

/**
 * Run the ASL model and return the top prediction with all 38 class scores.
 *
 * @param landmarks  21 MediaPipe hand landmarks (x,y in [0,1])
 * @param videoWidth  Pixel width of the live video element
 * @param videoHeight Pixel height of the live video element
 */
export async function predict(
  landmarks: Array<{ x: number; y: number }>,
  videoWidth  = 640,
  videoHeight = 480,
): Promise<Prediction> {
  const fn = await loadModel();
  const input = normalizeLandmarks(landmarks, videoWidth, videoHeight);
  const raw = fn(input);
  const scores = Array.from(raw as number[]);

  let maxIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[maxIdx]) maxIdx = i;
  }

  // ── Debug logging (throttled to 1/sec) ──────────────────────────────────
  const now = Date.now();
  if (window.__ASL_DEBUG && now - lastDebugLog > 1000) {
    lastDebugLog = now;
    const top5 = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([i, s]) => `  [${i}] ${String(LABELS[i]).padEnd(4)} → ${(s * 100).toFixed(1)}%`)
      .join('\n');
    const inputMax = Math.max(...input);
    const rangeOk  = inputMax > 20 && inputMax < 500;
    console.log(
      `\n🔍 [ASL Debug] Model: ${modelSource} | Video: ${videoWidth}×${videoHeight}\n` +
      `   Input length : ${input.length} (expected 42)\n` +
      `   Input[0..7]  : ${input.slice(0, 8).map(v => v.toFixed(1)).join(', ')}\n` +
      `   Input max    : ${inputMax.toFixed(1)} ${rangeOk ? '✅ (good range)' : '❌ (unexpected – check video dims)'}\n` +
      `   Expected range: 0 – ~250 (pixel span of hand)\n` +
      `   Top-5:\n${top5}`
    );
  }

  return {
    label: LABELS[maxIdx] ?? '?',
    confidence: scores[maxIdx],
    index: maxIdx,
    scores,
  };
}

// Preload the model immediately on first import
loadModel().catch(err => console.warn('[ASL] Model preload failed:', err));
