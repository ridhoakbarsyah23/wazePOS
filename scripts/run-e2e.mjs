import { spawn } from "node:child_process";
import { once } from "node:events";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;
const hasProvidedBaseUrl = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const e2eEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://wazepos:wazepos@127.0.0.1:5434/wazepos",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-with-at-least-32-characters",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseUrl,
  SITE_URL: process.env.SITE_URL ?? "https://wazepos-e2e.local",
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wazepos-e2e.local",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "re_e2e_local_only",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "WazePOS E2E <noreply@wazepos.test>",
  CRON_SECRET: process.env.CRON_SECRET ?? "e2e-local-cron-secret",
  BANK_TRANSFER_BANK: process.env.BANK_TRANSFER_BANK ?? "Bank E2E",
  BANK_TRANSFER_ACCOUNT_NUMBER: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "9876543210",
  BANK_TRANSFER_ACCOUNT_NAME: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "PT WazePOS E2E",
  PLATFORM_ADMIN_EMAILS: process.env.PLATFORM_ADMIN_EMAILS ?? "admin@wazepos.test",
  PLAYWRIGHT_BASE_URL: baseUrl,
};

let serverProcess;

function spawnServer() {
  return spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", host, "--port", port],
    {
      env: e2eEnv,
      stdio: "inherit",
      windowsHide: true,
    },
  );
}

async function waitForServer() {
  const liveUrl = new URL("/api/live", baseUrl);
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(liveUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${liveUrl}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill();

  await Promise.race([
    once(serverProcess, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
    serverProcess.kill("SIGKILL");
  }
}

async function runPlaywright() {
  const child = spawn(
    process.execPath,
    ["node_modules/playwright/cli.js", "test", ...process.argv.slice(2)],
    {
      env: e2eEnv,
      stdio: "inherit",
      windowsHide: true,
    },
  );

  const [code, signal] = await once(child, "exit");
  if (signal) {
    throw new Error(`Playwright exited from signal ${signal}`);
  }

  process.exitCode = code ?? 1;
}

try {
  if (!hasProvidedBaseUrl) {
    serverProcess = spawnServer();
    await waitForServer();
  }

  await runPlaywright();
} finally {
  await stopServer();
}
