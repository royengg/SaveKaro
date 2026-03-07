import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-core";
          }
          if (
            id.includes("/node_modules/react-router/") ||
            id.includes("/node_modules/react-router-dom/") ||
            id.includes("/node_modules/history/") ||
            id.includes("/node_modules/zustand/")
          ) {
            return "router-state";
          }
          if (id.includes("/node_modules/@tanstack/react-query/")) {
            return "query";
          }
          if (id.includes("/node_modules/@radix-ui/")) {
            return "radix";
          }
          if (id.includes("/node_modules/lucide-react/")) {
            return "icons";
          }
          if (id.includes("/node_modules/recharts/")) {
            return "charts";
          }
          if (id.includes("/node_modules/react-masonry-css/")) {
            return "masonry";
          }
          if (id.includes("/node_modules/react-intersection-observer/")) {
            return "observer";
          }
          if (id.includes("/node_modules/sonner/")) {
            return "sonner";
          }
        },
      },
    },
  },
});
