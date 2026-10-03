import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "out/**",
    "next-env.d.ts",
    ".opencode/**",
    "design-system/**",
    ".playwright-results/**",
    "playwright-report/**",
    "test-results/**",
    "scratch/**",
  ]),
  // Batas arsitektur (lihat docs/architecture.md):
  // - `shared/` isomorphic: tidak boleh menyentuh server/db/app.
  // - `server/` tidak boleh bergantung pada layer routing `app/`.
  // - `components/ui/` hanya primitive presentational.
  {
    files: ["shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server", "@/server/*", "@/db", "@/db/*", "@/app", "@/app/*"],
              message:
                "`shared/` harus isomorphic — jangan import `@/server`, `@/db`, atau `@/app`.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/*"],
              message:
                "`server/` tidak boleh bergantung pada layer routing `app/`.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app",
                "@/app/*",
                "@/server",
                "@/server/*",
                "@/db",
                "@/db/*",
                // Direktori domain komponen — pola direktori polos sudah mencakup
                // seluruh isinya (matcher `ignore` tidak mendukung brace expansion,
                // jadi tiap domain ditulis eksplisit). Sibling sesama
                // `components/ui` tetap boleh via alias `@/components/ui/*`.
                "@/components/account",
                "@/components/admin",
                "@/components/auth",
                "@/components/catalog",
                "@/components/customers",
                "@/components/dashboard",
                "@/components/inventory",
                "@/components/marketing",
                "@/components/onboarding",
                "@/components/pos",
                "@/components/settings",
                "@/components/shared",
                "@/components/staff",
                "@/components/subscription",
              ],
              message:
                "`components/ui/` hanya primitive presentational — tidak boleh import domain bisnis, server, db, atau app.",
            },
          ],
        },
      ],
    },
  },
]);
