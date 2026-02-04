import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // Default is current dir, but good to be explicit
  css: {
    devSourcemap: true // Enable SCSS source maps in dev
  },
  build: {
    sourcemap: true, // Enable JS source maps in build
    // outDir: '../dist' // Match standard output
  },
  server: {
    host: true // Expose to network (good for mobile testing)
  }
});
