import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  server: {
    proxy: {
      "/api/jules": {
        target: "https://jules.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jules/, "/v1alpha"),
        secure: true,
      },
    },
  },
})
