import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  root: __dirname,
  envDir: __dirname,
  logLevel: "error",
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      onwarn() { },
    },
  },
  esbuild: {
    legalComments: "none",
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
