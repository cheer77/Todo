import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // Default is current dir, but good to be explicit
  publicDir: 'public', // Vite will copy this folder to dist
  css: {
    devSourcemap: true // Enable SCSS source maps in dev
  },
  build: {
    sourcemap: false, // Disable in production for smaller output
  },
  server: {
    host: true // Expose to network (good for mobile testing)
  }
});
