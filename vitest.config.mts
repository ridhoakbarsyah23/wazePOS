import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // GSAP ScrollTrigger + ~50 tweens koreografi memakan ±5 dtk per test di jsdom.
    testTimeout: 15_000,
  },
});
