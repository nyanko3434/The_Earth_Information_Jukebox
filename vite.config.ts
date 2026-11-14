import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/.
  // Build media URLs from import.meta.env.BASE_URL, never from a bare '/'.
  base: '/The_Earth_Information_Jukebox/',
  plugins: [react()],
})
