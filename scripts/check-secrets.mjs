import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const sensitiveKeys = new Set([
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "MIDTRANS_SERVER_KEY",
  "LEAD_WEBHOOK_SECRET",
]);

const placeholderTokens = [
  "USER",
  "PASSWORD",
  "HOST",
  "YOUR_",
  "DOMAIN-ANDA",
  "secret-acak",
  "secret-opsional",
  "client-secret",
  "server-key-dari-",
  "postgres....",
];

function isPlaceholder(value) {
  return value.length === 0 || placeholderTokens.some((token) => value.includes(token));
}

function isLocalDatabaseUrl(value) {
  if (!value.startsWith("postgres://") && !value.startsWith("postgresql://")) return false;

  const authority = value.split("//", 2)[1]?.split("/", 1)[0] ?? "";
  const hostWithPort = authority.slice(authority.lastIndexOf("@") + 1);
  const host = hostWithPort.split(":", 1)[0].toLowerCase();

  return host === "localhost" || host === "127.0.0.1" || host === "postgres" || host === "db";
}

const trackedOutput = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
const trackedFiles = trackedOutput.split("\0").filter(Boolean);
const findings = [];

for (const file of trackedFiles) {
  try {
    if (statSync(file).size > 1024 * 1024) continue;

    const content = readFileSync(file, "utf8");
    if (content.includes("\0")) continue;

    content.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || !sensitiveKeys.has(match[1])) return;

      const key = match[1];
      const value = match[2].replace(/^['"]|['"]$/g, "").trim();
      const safe = isPlaceholder(value) || (key === "DATABASE_URL" && isLocalDatabaseUrl(value));

      if (!safe) findings.push(`${file}:${index + 1}:${key}`);
    });
  } catch {
    // Ignore files that disappear or cannot be decoded during the scan.
  }
}

if (findings.length > 0) {
  console.error("Potential populated secrets found in tracked files:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  console.error("Move real values to an ignored .env file or the deployment secret store.");
  process.exit(1);
}

console.log("Secret scan passed: no populated sensitive assignments found in tracked files.");
