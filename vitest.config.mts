import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // Test yang meng-import modul `server/` langsung butuh stub ini karena
      // package `server-only` tidak punya entry yang bisa di-resolve di vitest.
      "server-only": fileURLToPath(new URL("./__tests__/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // GSAP ScrollTrigger + ~50 tweens koreografi memakan ±5 dtk per test di jsdom.
    testTimeout: 15_000,
  },
});
