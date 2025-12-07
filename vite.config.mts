import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill 'global' for libraries like eciesjs/elliptic
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Polyfill 'buffer' specifically
      buffer: "buffer/",
    },
  },
});