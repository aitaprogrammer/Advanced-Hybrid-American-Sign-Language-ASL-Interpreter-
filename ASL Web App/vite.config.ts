import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Allow .task files (MediaPipe WASM model)
  assetsInclude: ['**/*.task', '**/*.bin'],
  build: {
    // asl_model.js is ~2MB; suppress size warning
    chunkSizeWarningLimit: 8000,
  },
});
