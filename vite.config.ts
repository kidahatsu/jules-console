import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Bridge standard system bash environment variables (with or without VITE_ prefix)
  const julesKey = env.VITE_JULES_API_KEY || env.JULES_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
  const githubToken = env.VITE_GITHUB_TOKEN || env.GITHUB_TOKEN || env.GH_TOKEN || '';
  const hfToken = env.VITE_HF_TOKEN || env.HF_TOKEN || env.HUGGING_FACE_HUB_TOKEN || env.HUGGINGFACE_TOKEN || '';

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
