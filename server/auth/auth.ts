import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { schema, user } from "@/db/schema";
import { sendVerificationOtpEmail } from "@/server/email/otp-email";
import { sendPasswordResetEmail } from "@/server/email/password-reset-email";

/** Masa berlaku kode OTP verifikasi email (10 menit, dalam detik). */
export const EMAIL_OTP_EXPIRES_IN_SECONDS = 600;

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
  user: {
    additionalFields: {
      privacyAcceptedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  account: {
    encryptOAuthTokens: true,
    // Pendaftaran email/kata sandi mewajibkan verifikasi OTP
    // (requireEmailVerification: true), sehingga penautan otomatis akun Google
    // ke user yang sama emailnya harus diizinkan secara eksplisit melalui
    // trustedProviders — tanpa ini, login Google mengembalikan account_not_linked.
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // User lokal yang belum verifikasi tetap boleh ditautkan ke akun Google:
      // email akun Google sendiri sudah diverifikasi oleh Google, dan user
      // manual tidak bisa mencapai onboarding sebelum OTP terverifikasi.
      requireLocalEmailVerified: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Pendaftaran email/kata sandi mewajibkan verifikasi OTP sebelum akun
    // dapat dipakai masuk (diblokir di sign-in bila emailVerified=false).
    // User Google/OAuth dilewati karena emailnya sudah diverifikasi Google.
    requireEmailVerification: true,
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
  emailVerification: {
    // Setelah OTP terverifikasi, sesi langsung dibuat agar pendaftar manual
    // bisa lanjut ke onboarding tanpa login ulang.
    autoSignInAfterVerification: true,
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
  plugins: [
    nextCookies(),
    // Kode OTP 6 digit untuk verifikasi email pendaftar manual, disimpan di
    // tabel `verification` yang sudah ada (tanpa migrasi tambahan).
    emailOTP({
      otpLength: 6,
      expiresIn: EMAIL_OTP_EXPIRES_IN_SECONDS,
      sendVerificationOnSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "email-verification") return;
        let recipientName: string | null = null;
        try {
          const [recipient] = await db
            .select({ name: user.name })
            .from(user)
            .where(eq(user.email, email.toLowerCase()))
            .limit(1);
          recipientName = recipient?.name ?? null;
        } catch {
          recipientName = null;
        }
        after(async () => {
          try {
            await sendVerificationOtpEmail({
              recipient: email,
              recipientName,
              otp,
              expiresInMinutes: Math.round(EMAIL_OTP_EXPIRES_IN_SECONDS / 60),
            });
          } catch (error) {
            console.error(
              "[VERIFICATION_OTP_EMAIL_ERROR]",
              error instanceof Error ? error.message : "Unknown email delivery error",
            );
          }
        });
      },
    }),
  ],
});
