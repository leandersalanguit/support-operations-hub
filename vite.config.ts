/**
 * @fileoverview Vite build configuration.
 * Configures the build process, registers the React plugin, and sets up
 * the development server options like port number and auto-open behavior.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Base public path for assets (supports GitHub Pages subpath and local preview)
  base: process.env.GITHUB_PAGES === 'true' ? '/support-operations-hub/' : './',
  // Register necessary Vite plugins
  plugins: [react()],
  // Production build optimizations
  build: {
    target: 'es2020', // Match tsconfig target
    sourcemap: false, // Disable for production (smaller deploy)
    rollupOptions: {
      output: {
        // Split vendor dependencies into separate cached chunks
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'react-hook-form'],
        },
      },
    },
  },
  // Configure the development server
  server: {
    port: 3000,
    open: true // Automatically open the application in the browser on server start
  }
});
