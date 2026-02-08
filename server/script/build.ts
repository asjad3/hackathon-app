import { build as esbuild } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

async function buildServer() {
  console.log("Building server...");

  await esbuild({
    entryPoints: [path.join(serverRoot, "index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: path.join(serverRoot, "dist/index.cjs"),
    external: [
      "express",
      "pg",
      "pg-native",
      "@supabase/supabase-js",
      "express-session",
      "memorystore",
      "bcryptjs",
      "nodemailer",
    ],
    loader: {
      ".node": "copy",
    },
    tsconfigRaw: {
      compilerOptions: {
        strict: false,
        skipLibCheck: true,
        noEmit: true,
      },
    },
  });

  console.log("Server built successfully.");
}

buildServer().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
