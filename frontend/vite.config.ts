import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setupTests.ts",
  },
  server: {
    proxy: {
      "/api": {
        target:
          loadEnv(mode, process.cwd(), "API_PROXY_")["API_PROXY_TARGET"] || "http://localhost:5000",
        changeOrigin: true,
        secure: true,
      },
    },
  },
}));
