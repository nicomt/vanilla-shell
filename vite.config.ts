import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  root: '.',
  base: '/vanilla-shell/',
  plugins: [
    nodePolyfills({
      // Enable Buffer polyfill for memfs
      include: ['buffer', 'process', 'events', 'stream', 'path', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    include: ['memfs', '@xterm/xterm', '@xterm/addon-fit'],
  },
});
