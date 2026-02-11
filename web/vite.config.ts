import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  optimizeDeps: {
    // Force pre-bundle so deps are stable (avoids 504 Outdated Optimize Dep)
    include: ["sql.js", "localforage"],
  },
  server: {
    fs: { strict: true },
  },
});
