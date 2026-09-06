import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  // Load only variables prefixed with VITE_ to prevent ambient host environment variable leakage
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProduction = mode === 'production' || command === 'build';

  // Ensure production builds NEVER embed secrets: credentials must be supplied exclusively by the end user via Settings UI
  const julesKey = isProduction ? '' : (env.VITE_JULES_API_KEY || '');
  const githubToken = isProduction ? '' : (env.VITE_GITHUB_TOKEN || '');
  const hfToken = isProduction ? '' : (env.VITE_HF_TOKEN || '');

  return {
    define: {
      'import.meta.env.VITE_JULES_API_KEY': JSON.stringify(julesKey),
      'import.meta.env.VITE_GITHUB_TOKEN': JSON.stringify(githubToken),
      'import.meta.env.VITE_HF_TOKEN': JSON.stringify(hfToken),
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query", "@tanstack/react-query-persist-client", "idb-keyval"],
            "vendor-ui": ["framer-motion", "clsx", "tailwind-merge"],
            "vendor-icons": ["lucide-react"],
            "vendor-markdown": ["react-markdown", "remark-gfm", "rehype-sanitize"],
            "vendor-octokit": ["@octokit/core"],
          },
        },
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
  };
})
