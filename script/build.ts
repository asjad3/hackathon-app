import { build } from "vite";
import { build as esbuild } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function buildApp() {
    console.log("🏗️  Building client...");

    // Build client with Vite
    await build({
        root: path.join(root, "client"),
        resolve: {
            alias: {
                "@": path.join(root, "client", "src"),
                "@shared": path.join(root, "shared"),
            },
        },
        build: {
            outDir: path.join(root, "dist/public"),
            emptyOutDir: true,
        },
    });

    console.log("✅ Client built successfully");

    console.log("🏗️  Building server...");

    // Build server with esbuild
    await esbuild({
        entryPoints: [path.join(root, "server/index.ts")],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        outfile: path.join(root, "dist/index.cjs"),
        external: [
            "express",
            "pg",
            "pg-native",
            "@supabase/supabase-js",
            "express-session",
            "memorystore",
            "vite",
            "esbuild",
            "lightningcss",
            "@babel/*",
            "rollup",
            "postcss",
            "tailwindcss",
            "bcryptjs",
            "nodemailer",
        ],
        loader: {
            ".node": "copy",
        },
    });

    console.log("✅ Server built successfully");
    console.log("🎉 Build complete!");
}

buildApp().catch((err) => {
    console.error("❌ Build failed:", err);
    process.exit(1);
});
