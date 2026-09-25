import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // React + framer-motion land just above Vite's 500 kB default; charts are already split out.
    chunkSizeWarningLimit: 600,
  },
})
