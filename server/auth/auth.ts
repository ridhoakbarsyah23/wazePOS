import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { db } from "@/db";
import { schema } from "@/db/schema";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email";

const configuredOrigin =
  process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "wazePOS",
  baseURL: configuredOrigin,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: Array.from(
    new Set(
      [
        configuredOrigin,
        // Origin localhost hanya dipercaya saat development
        ...(process.env.NODE_ENV !== "production"
          ? [
              "http://localhost:3000",
              "http://localhost:3001",
              "http://localhost:3002",
              "http://localhost:3003",
              "http://127.0.0.1:3000",
              "http://127.0.0.1:3001",
              "http://127.0.0.1:3002",
              "http://127.0.0.1:3003",
            ]
          : []),
      ].filter((origin): origin is string => Boolean(origin))
    )
  ),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),
  account: {
    encryptOAuthTokens: true,
    // Pengguna dapat mendaftar via email/kata sandi tanpa verifikasi email
    // (requireEmailVerification: false), sehingga penautan otomatis akun Google
    // ke user yang sama emailnya harus diizinkan secara eksplisit melalui
    // trustedProviders — tanpa ini, login Google mengembalikan account_not_linked.
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // Signup aplikasi ini tidak mewajibkan verifikasi email (lihat
      // emailAndPassword.requireEmailVerification), sehingga user lokal dapat
      // berstatus email_verified=false. Default better-auth 1.7 menolak
      // penautan ke user lokal yang belum terverifikasi — dinonaktifkan karena
      // email akun Google sendiri sudah diverifikasi oleh Google.
      requireLocalEmailVerified: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Signup pelanggan tetap tidak memerlukan verifikasi; akses Platform Admin
    // kembali memeriksa emailVerified + allowlist di server.
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      after(async () => {
        try {
          await sendPasswordResetEmail({
            recipient: user.email,
            recipientName: user.name,
            resetUrl: url,
          });
        } catch (error) {
          console.error(
            "[PASSWORD_RESET_EMAIL_ERROR]",
            error instanceof Error ? error.message : "Unknown email delivery error",
          );
        }
      });
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account",
          },
        }
      : {},
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/sign-in/social": { window: 60, max: 10 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  plugins: [nextCookies()],
});
