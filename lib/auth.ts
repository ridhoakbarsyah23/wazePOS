import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { schema } from "@/db/schema";

const configuredOrigin = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
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
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
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
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
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
    },
  },
  plugins: [nextCookies()],
});
