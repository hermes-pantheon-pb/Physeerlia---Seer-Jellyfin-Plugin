import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    outDir: path.resolve(__dirname, '../src/Jellyfin.Plugin.Seer/Web'),
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'JellyfinSeerPlugin',
      formats: ['iife'],
      fileName: () => 'seer.bundle.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'seer.bundle.css';
          }
          return '[name][extname]';
        }
      }
    }
  }
});
