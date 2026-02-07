import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        react({
            jsxRuntime: "automatic",
            jsxImportSource: "react",
            babel: {
                plugins: [],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.join(__dirname, "client", "src"),
            "@shared": path.join(__dirname, "shared"),
        },
    },
    root: path.join(__dirname, "client"),
    envDir: __dirname,
    build: {
        outDir: path.join(__dirname, "dist", "public"),
        emptyOutDir: true,
        sourcemap: false,
        minify: "terser",
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("react") || id.includes("react-dom")) {
                            return "react-vendor";
                        }
                        if (id.includes("@radix-ui")) {
                            return "radix-vendor";
                        }
                    }
                },
            },
        },
    },
    server: {
        fs: {
            strict: true,
            deny: ["**/.*"],
        },
    },
});
