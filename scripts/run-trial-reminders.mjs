import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function optionValue(name) {
  const inline = process.argv.find((item) => item.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const rawBaseUrl =
  optionValue("--url") ??
  process.env.TRIAL_REMINDER_BASE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://127.0.0.1:3000";
const cronSecret = process.env.CRON_SECRET?.trim();

if (!cronSecret) {
  console.error("CRON_SECRET belum tersedia. Isi .env.local atau environment sebelum menjalankan script.");
  process.exit(1);
}

const url = new URL("/api/billing/trial-reminders", rawBaseUrl.replace(/\/+$/, ""));

console.log(`Memanggil pengingat trial: ${url.toString()}`);

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${cronSecret}`,
  },
});

const text = await response.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  payload = { message: text };
}

console.log(JSON.stringify({ status: response.status, ...payload }, null, 2));

if (!response.ok) {
  process.exit(1);
}
