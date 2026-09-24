import { randomBytes, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos";
const allowRemote = process.argv.includes("--remote");
const resetPassword = process.argv.includes("--reset-password");
const generatePassword = process.argv.includes("--generate-password");
const isRemote = !/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(databaseUrl);

if (isRemote && !allowRemote) {
  console.error(
    [
      "SEEDER DIBATALKAN: DATABASE_URL menunjuk ke database remote.",
      "Jalankan dengan --remote hanya jika memang ingin membuat atau mereset akun di environment tersebut.",
    ].join("\n"),
  );
  process.exit(1);
}

const allowlistedEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const email = allowlistedEmails[0] ?? "";
const name = process.env.PLATFORM_ADMIN_NAME?.trim() || "Platform Admin";
const configuredPassword = process.env.PLATFORM_ADMIN_SEED_PASSWORD ?? "";
const generatedPassword = !configuredPassword && generatePassword;
const password = configuredPassword || (generatedPassword ? `${randomBytes(18).toString("base64url")}Aa1!` : "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!email || !emailPattern.test(email)) {
  console.error("PLATFORM_ADMIN_EMAILS wajib berisi minimal satu email yang valid.");
  process.exit(1);
}

if (name.length < 2 || name.length > 80) {
  console.error("PLATFORM_ADMIN_NAME harus berisi 2-80 karakter.");
  process.exit(1);
}

if (password.length < 8 || password.length > 128) {
  console.error("PLATFORM_ADMIN_SEED_PASSWORD harus berisi 8-128 karakter.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const passwordHash = await hashPassword(password);
  let passwordApplied = false;
  const [existingUser] = await sql`
    select id, name, email
    from "user"
    where lower(email) = ${email}
    limit 1
  `;

  if (!existingUser) {
    const userId = randomUUID();
    await sql.begin(async (transaction) => {
      await transaction`
        insert into "user" (id, name, email, email_verified)
        values (${userId}, ${name}, ${email}, true)
      `;
      await transaction`
        insert into account (id, account_id, provider_id, user_id, password)
        values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash})
      `;
    });

    passwordApplied = true;
    console.log(`Platform Admin lokal berhasil dibuat untuk ${email}.`);
  } else {
    const credentialAccounts = await sql`
      select id, account_id, password
      from account
      where user_id = ${existingUser.id}
        and provider_id = 'credential'
      order by (account_id = ${existingUser.id}) desc,
               (password is not null) desc
    `;
    const canonicalCredential = credentialAccounts.find(
      (account) => account.account_id === existingUser.id,
    );
    const legacyCredential = credentialAccounts.find(
      (account) => account.account_id !== existingUser.id,
    );

    if (canonicalCredential) {
      if (!canonicalCredential.password) {
        await sql`
          update account
          set password = ${passwordHash}, updated_at = now()
          where id = ${canonicalCredential.id}
        `;
        passwordApplied = true;
        console.log(`Password credential Platform Admin ${email} berhasil ditambahkan.`);
      } else if (resetPassword) {
        await sql`
          update account
          set password = ${passwordHash}, updated_at = now()
          where id = ${canonicalCredential.id}
        `;
        passwordApplied = true;
        console.log(`Password Platform Admin ${email} berhasil diperbarui.`);
      } else {
        console.log(
          [
            `Akun ${email} dan login password sudah tersedia; tidak ada data yang diubah.`,
            "Gunakan --reset-password jika password memang ingin diganti sesuai PLATFORM_ADMIN_SEED_PASSWORD.",
          ].join("\n"),
        );
      }
    } else if (legacyCredential) {
      await sql`
        update account
        set account_id = ${existingUser.id},
            password = ${passwordHash},
            updated_at = now()
        where id = ${legacyCredential.id}
      `;
      passwordApplied = true;
      console.log(`Credential legacy Platform Admin ${email} berhasil diperbaiki.`);
    } else {
      await sql`
        insert into account (id, account_id, provider_id, user_id, password)
        values (${randomUUID()}, ${existingUser.id}, 'credential', ${existingUser.id}, ${passwordHash})
      `;
      passwordApplied = true;
      console.log(`Login password ditambahkan ke akun Platform Admin ${email}.`);
    }
  }

  if (generatedPassword && passwordApplied) {
    console.log(`Password sementara (ditampilkan sekali): ${password}`);
  }
  console.log("Login melalui /login; akun seeder akan otomatis diarahkan ke /admin.");
} catch (error) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "UNKNOWN";
  console.error(`Seeder Platform Admin gagal (${code}). Pastikan migrasi database sudah diterapkan.`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
