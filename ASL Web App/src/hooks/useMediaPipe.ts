import { useEffect, useRef, useState, useCallback } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

export interface LandmarkPoint { x: number; y: number; z: number; }

/** Called every frame with fresh landmarks (or null if no hand detected). */
export type OnLandmarksCallback = (lms: LandmarkPoint[] | null) => void;

interface UseMediaPipeReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Latest landmarks – also available via onLandmarks callback for zero-lag inference */
  landmarksRef: React.MutableRefObject<LandmarkPoint[] | null>;
  isReady: boolean;
  isRunning: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  /** Register a callback that fires every frame with the latest landmarks */
  setOnLandmarks: (cb: OnLandmarksCallback | null) => void;
}

const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],[0,17],
];

function drawHand(
  ctx: CanvasRenderingContext2D,
  lms: LandmarkPoint[],
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(34,211,238,0.75)';
  ctx.lineWidth = 2.5;
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(lms[a].x * w, lms[a].y * h);
    ctx.lineTo(lms[b].x * w, lms[b].y * h);
    ctx.stroke();
  }
  for (let i = 0; i < lms.length; i++) {
    const p = lms[i];
    // Fingertips (4,8,12,16,20) are larger
    const r = [4,8,12,16,20].includes(i) ? 7 : 5;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? 'rgba(249,115,22,0.9)' : 'rgba(99,102,241,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function useMediaPipe(): UseMediaPipeReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const onLandmarksRef = useRef<OnLandmarksCallback | null>(null);

  // Use a ref for landmarks so the inference callback always sees latest value
  // without triggering React re-renders on every frame
  const landmarksRef = useRef<LandmarkPoint[] | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOnLandmarks = useCallback((cb: OnLandmarksCallback | null) => {
    onLandmarksRef.current = cb;
  }, []);

  // ── Initialise MediaPipe HandLandmarker (once) ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (!cancelled) {
          handLandmarkerRef.current = hl;
          setIsReady(true);
        }
      } catch (e) {
        if (!cancelled) setError('MediaPipe failed to load: ' + String(e));
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // ── Per-frame detection loop ─────────────────────────────────────────────
  // NOTE: detectLoop is defined as a plain function (not useCallback) so it
  // always closes over the *current* refs, never stale state.
  const detectLoop = useCallback(function loop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hl = handLandmarkerRef.current;

    if (!video || !canvas || !hl || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    // Only process new frames (avoids re-running on the same video timestamp)
    const now = performance.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

      const result: HandLandmarkerResult = hl.detectForVideo(video, now);

      // Resize canvas to match video (only when size changes)
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const ctx = canvas.getContext('2d');

      if (result.landmarks && result.landmarks.length > 0) {
        const lms = result.landmarks[0];
        landmarksRef.current = lms;
        if (ctx) drawHand(ctx, lms, canvas.width, canvas.height);
        // Fire callback synchronously in the RAF loop — zero lag
        onLandmarksRef.current?.(lms);
      } else {
        landmarksRef.current = null;
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        onLandmarksRef.current?.(null);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(detectLoop);
      setIsRunning(true);
    } catch (e) {
      setError('Camera access denied: ' + String(e));
    }
  }, [detectLoop]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    landmarksRef.current = null;
    lastVideoTimeRef.current = -1;
    setIsRunning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef, canvasRef, landmarksRef,
    isReady, isRunning, error,
    startCamera, stopCamera, setOnLandmarks,
  };
}
