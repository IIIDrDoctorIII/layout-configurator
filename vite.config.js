import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['fabric']
  },
  build: {
    commonjsOptions: {
      include: [/fabric/, /node_modules/]
    }
  }
});