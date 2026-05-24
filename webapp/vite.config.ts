import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Hiptron",
        short_name: "Hiptron",
        description: "Gentle mobility insights",
        theme_color: "#4F7E5E",
        background_color: "#FBF7F2",
        display: "standalone",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: { proxy: { "/api": "http://localhost:8000" } },
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"], globals: true },
});
