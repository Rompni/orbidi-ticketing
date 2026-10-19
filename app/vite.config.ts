import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  build: {
    target: "es2022",
    rollupOptions: {
      input: { overlay: "index.html", onboarding: "onboarding.html" },
    },
  },
});
