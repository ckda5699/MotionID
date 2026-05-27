import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const root = realpathSync(process.cwd());

export default defineConfig({
  root,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/app-logo.png"],
      manifest: {
        name: "Bundesliga Motion ID",
        short_name: "Motion ID",
        description: "Recognize Bundesliga players from movement alone.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#050505",
        theme_color: "#050505",
        icons: [
          {
            src: "/icons/app-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json,webmanifest}"],
        globIgnores: ["**/*.mp4", "**/*.webm", "**/*.mov"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === "video" || url.pathname.startsWith("/media/"),
            handler: "NetworkOnly",
            options: {
              cacheName: "motion-id-media-network-only",
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/data/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "motion-id-data",
            },
          },
        ],
      },
    }),
  ],
});
