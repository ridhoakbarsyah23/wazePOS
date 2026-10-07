import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

const unavailableDatabase = {
  connected: false,
  authTables: false,
  businessTables: false,
  latestSchema: false,
};

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function isHttpsUrl(value: string | undefined) {
  if (!value?.trim()) return false;
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function hasAdminAllowlist(value: string | undefined) {
  return Boolean(
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .some((item) => item.includes("@")),
  );
}

function hasProductionBankAccount() {
  const accountNumber = process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim();
  const accountName = process.env.BANK_TRANSFER_ACCOUNT_NAME?.trim();

  return (
    hasValue(process.env.BANK_TRANSFER_BANK) &&
    Boolean(accountNumber && accountNumber !== "1234567890") &&
    Boolean(accountName && accountName !== "PT wazePOS")
  );
}

export async function GET() {
  // Detail environment hanya untuk internal/debugging; produksi cukup status ok
  // supaya endpoint publik ini tidak membocorkan konfigurasi ke pihak luar.
  const isProduction = process.env.NODE_ENV === "production";
  const includeDetails = !isProduction;
  const siteUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

  const passwordResetEmail = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
  );
  const productionReadiness = {
    siteUrlHttps: isHttpsUrl(siteUrl),
    passwordResetEmail,
    trialReminderCron: hasValue(process.env.CRON_SECRET),
    bankTransfer: hasProductionBankAccount(),
    platformAdminAllowlist: hasAdminAllowlist(process.env.PLATFORM_ADMIN_EMAILS),
  };
  const environment = {
    databaseUrl: hasValue(process.env.DATABASE_URL),
    authSecret: hasValue(process.env.BETTER_AUTH_SECRET),
    authUrl: process.env.BETTER_AUTH_URL ?? null,
    siteUrl: siteUrl ?? null,
    productionReadiness,
  };
  const requiredEnvironmentReady =
    environment.databaseUrl &&
    environment.authSecret &&
    (!isProduction || Object.values(productionReadiness).every(Boolean));
  const deployment = {
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? null,
  };

  if (!requiredEnvironmentReady) {
    return NextResponse.json(
      { ok: false, deployment, ...(includeDetails ? { environment } : {}), database: unavailableDatabase },
      { status: 503 },
    );
  }

  try {
    const result = await db.execute<{
      userTable: string | null;
      accountTable: string | null;
      businessTable: string | null;
      subscriptionTable: string | null;
      subscriptionPaymentTable: string | null;
      leadTable: string | null;
      privacyAcceptedAt: boolean;
      trialReminderSentAt: boolean;
      disbursedAt: boolean;
    }>(
      sql`
        select
          to_regclass('public.user') as "userTable",
          to_regclass('public.account') as "accountTable",
          to_regclass('public.business') as "businessTable",
          to_regclass('public.subscription') as "subscriptionTable",
          to_regclass('public.subscription_payment') as "subscriptionPaymentTable",
          to_regclass('public.lead') as "leadTable",
          exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'user' and column_name = 'privacy_accepted_at'
          ) as "privacyAcceptedAt",
          exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'subscription' and column_name = 'trial_reminder_sent_at'
          ) as "trialReminderSentAt",
          exists (
            select 1 from information_schema.columns
            where table_schema = 'public' and table_name = 'subscription_payment' and column_name = 'disbursed_at'
          ) as "disbursedAt"
      `,
    );
    const tables = result[0];
    const authTables = Boolean(tables?.userTable && tables?.accountTable);
    const businessTables = Boolean(
      tables?.businessTable && tables?.subscriptionTable && tables?.subscriptionPaymentTable && tables?.leadTable,
    );
    const latestSchema = Boolean(
      tables?.privacyAcceptedAt && tables?.trialReminderSentAt && tables?.disbursedAt,
    );
    const schemaReady = authTables && businessTables && latestSchema;

    return NextResponse.json(
      {
        ok: schemaReady,
        deployment,
        ...(includeDetails ? { environment } : {}),
        database: { connected: true, authTables, businessTables, latestSchema },
      },
      { status: schemaReady ? 200 : 503 },
    );
  } catch (error) {
    console.error("Health check database failure", error);
    const errorCode =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "DATABASE_CONNECTION_FAILED";
    return NextResponse.json(
      {
        ok: false,
        deployment,
        ...(includeDetails ? { environment, errorCode } : {}),
        database: unavailableDatabase,
      },
      { status: 503 },
    );
  }
}
