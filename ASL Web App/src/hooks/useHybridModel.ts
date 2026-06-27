/**
 * useHybridModel.ts
 *
 * Loads the Teachable Machine TFjs model from /public/tfjs_hybrid_model/.
 * The weights file is named "weights.data" (not ".bin") to prevent browser
 * download managers (e.g. IDM) from intercepting the fetch as a file download.
 *
 * Labels: A B C  (3 classes, from metadata.json)
 * Preprocessing: (pixel / 127.5) - 1  →  [-1, +1]  (MobileNetV2 standard)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

/* ── Constants ───────────────────────────────────────────────────────── */
const MODEL_URL   = '/tfjs_hybrid_model/model.json';
const WEIGHTS_URL = '/tfjs_hybrid_model/weights.data'; // .data avoids IDM interception
const IMAGE_SIZE  = 224;
const FRAME_SKIP  = 5;

const TM_LABELS = ['A', 'B', 'C'];

export interface HybridPrediction {
  label: string;
  confidence: number;
}

/* ─────────────────────────────────────────────────────────────────────
   loadModelManually
   Fetches model.json and weights.data separately, then uses
   tf.io.fromMemory with a proper ModelArtifacts object.
   This bypasses TFjs's internal fetch handler AND avoids IDM
   interception of .bin files.
───────────────────────────────────────────────────────────────────── */
async function loadModelManually(): Promise<tf.LayersModel> {
  // 1 — fetch the model topology JSON
  console.info('[Hybrid] Fetching model.json…');
  const modelRes = await fetch(MODEL_URL);
  if (!modelRes.ok) throw new Error(`model.json fetch failed: HTTP ${modelRes.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelJSON: any = await modelRes.json();

  // 2 — fetch the weights as a raw binary buffer
  console.info('[Hybrid] Fetching weights.data…');
  const weightsRes = await fetch(WEIGHTS_URL);
  if (!weightsRes.ok) throw new Error(`weights.data fetch failed: HTTP ${weightsRes.status}`);
  const weightData = await weightsRes.arrayBuffer();

  if (weightData.byteLength === 0) {
    throw new Error(
      'weights.data was fetched but is empty (0 bytes). ' +
      'Check that the file exists in public/tfjs_hybrid_model/ and is not being blocked.'
    );
  }
  console.info(`[Hybrid] weights.data: ${(weightData.byteLength / 1024 / 1024).toFixed(2)} MB`);

  // 3 — build a ModelArtifacts object (TFjs 2.x in-memory format)
  //     weightSpecs come from the first entry of weightsManifest
  const weightSpecs: tf.io.WeightsManifestEntry[] =
    modelJSON.weightsManifest.flatMap(
      (group: { weights: tf.io.WeightsManifestEntry[] }) => group.weights
    );

  const artifacts: tf.io.ModelArtifacts = {
    modelTopology: modelJSON.modelTopology,
    weightSpecs,
    weightData,
    // carry over training config / signature if present
    trainingConfig:  modelJSON.trainingConfig  ?? undefined,
    userDefinedMetadata: modelJSON.userDefinedMetadata ?? undefined,
  };

  // 4 — load from memory (no network calls at this point)
  const model = await tf.loadLayersModel(tf.io.fromMemory(artifacts));
  return model;
}

/* ─────────────────────────────────────────────────────────────────────
   useHybridModel hook
───────────────────────────────────────────────────────────────────── */
export function useHybridModel(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active = false,
) {
  const [prediction, setPrediction] = useState<HybridPrediction>({ label: '—', confidence: 0 });
  const [modelReady, setModelReady]   = useState(false);
  const [modelError, setModelError]   = useState<string | null>(null);

  const modelRef   = useRef<tf.LayersModel | null>(null);
  const rafRef     = useRef<number | null>(null);
  const frameCount = useRef(0);
  const offscreen  = useRef<HTMLCanvasElement | null>(null);

  /* ── Load when active, dispose when leaving Hybrid tab ─────────────── */
  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    (async () => {
      try {
        const model = await loadModelManually();
        if (cancelled) { model.dispose(); return; }

        modelRef.current = model;

        // Warm-up pass — eliminates first-frame latency spike
        tf.tidy(() => {
          const dummy = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
          (model.predict(dummy) as tf.Tensor).dataSync();
        });

        setModelReady(true);
        setModelError(null);
        console.info('[Hybrid] Model ready ✅ Input:', model.inputs[0].shape);
      } catch (err) {
        if (!cancelled) {
          const msg = (err as Error).message ?? String(err);
          console.error('[Hybrid] Load error:', err);
          setModelError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (modelRef.current) { modelRef.current.dispose(); modelRef.current = null; }
      setModelReady(false);
      setPrediction({ label: '—', confidence: 0 });
    };
  }, [active]);

  /* ── Inference RAF loop ─────────────────────────────────────────────── */
  const runLoop = useCallback(() => {
    const video = videoRef.current;
    if (!modelRef.current || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runLoop);
      return;
    }

    frameCount.current++;

    if (frameCount.current % FRAME_SKIP === 0) {
      if (!offscreen.current) {
        offscreen.current = document.createElement('canvas');
        offscreen.current.width  = IMAGE_SIZE;
        offscreen.current.height = IMAGE_SIZE;
      }
      const ctx = offscreen.current.getContext('2d');
      if (ctx) {
        // Mirror horizontally to match camera display
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -IMAGE_SIZE, 0, IMAGE_SIZE, IMAGE_SIZE);
        ctx.restore();

        tf.tidy(() => {
          // MobileNetV2 preprocessing: (pixel / 127.5) - 1  →  [-1, +1]
          const imgTensor = tf.browser
            .fromPixels(offscreen.current!)
            .toFloat()
            .div(127.5)
            .sub(1)
            .expandDims(0); // [1, 224, 224, 3]

          const scores = (modelRef.current!.predict(imgTensor) as tf.Tensor2D)
            .dataSync() as Float32Array;

          let maxIdx = 0;
          for (let i = 1; i < scores.length; i++) {
            if (scores[i] > scores[maxIdx]) maxIdx = i;
          }

          setPrediction({ label: TM_LABELS[maxIdx] ?? '?', confidence: scores[maxIdx] });
        });
      }
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [videoRef]);

  /* ── Start / stop loop ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!modelReady || !active) return;
    rafRef.current = requestAnimationFrame(runLoop);
    return () => {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [modelReady, active, runLoop]);

  return { prediction, modelReady, modelError };
}
