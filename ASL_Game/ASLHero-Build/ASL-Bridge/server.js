const { WebSocketServer } = require('ws');
const { score } = require('./asl_model.js');
const puppeteer = require('puppeteer');
const path = require('path');

const LABELS = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '0','1','2','3','4','5','6','7','8','9',' ','.'
];

let unityClient = null;

const wss = new WebSocketServer({ port: 8080 });
console.log('Bridge server running on ws://localhost:8080');

wss.on('connection', (ws, req) => {
  const url = req.url;
  console.log('Client connected, url:', url);

  if (url === '/unity') {
    unityClient = ws;
    console.log('Unity connected');
    ws.on('close', () => {
      unityClient = null;
      console.log('Unity disconnected');
    });
  } else {
    ws.on('message', (data) => {
      try {
        const { landmarks } = JSON.parse(data);
        processAndSend(landmarks);
      } catch (e) {}
    });
  }
});

function processAndSend(landmarks) {
  const minX = Math.min(...landmarks.filter((_, i) => i % 2 === 0));
  const minY = Math.min(...landmarks.filter((_, i) => i % 2 === 1));
  const input = [];
  for (let i = 0; i < 21; i++) {
    input.push(landmarks[i * 2] - minX);
    input.push(landmarks[i * 2 + 1] - minY);
  }
  const probs = score(input);
  const idx = probs.indexOf(Math.max(...probs));

  if (unityClient && unityClient.readyState === 1) {
    unityClient.send(JSON.stringify({
      letter: LABELS[idx],
      confidence: probs[idx],
      index: idx
    }));
  }
}

async function startMediaPipe() {
  console.log('Starting headless MediaPipe...');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--window-size=1,1',
      '--window-position=-10000,0'
    ]
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('Browser:', msg.text()));
  page.on('pageerror', err => console.log('Browser error:', err.message));

  await page.goto('file://' + path.resolve(__dirname, 'mediapipe.html'));
  console.log('MediaPipe page loaded');

  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Starting polling...');

  setInterval(async () => {
    try {
      const data = await page.evaluate(() => ({
        landmarks: window._landmarks,
        frame: window._frame
      }));

      // Send prediction
      if (data.landmarks && data.landmarks.length === 42) {
        processAndSend(data.landmarks);
      }

      // Send frame as binary
      if (data.frame && unityClient && unityClient.readyState === 1) {
        const base64 = data.frame.replace('data:image/jpeg;base64,', '');
        const buffer = Buffer.from(base64, 'base64');
        unityClient.send(buffer);
      }

    } catch (e) {
      console.log('Poll error:', e.message);
    }
  }, 100);
}

startMediaPipe();