import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true, // Automatically opens your browser when you run the server
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});