export type BankTransferDestination = {
  bank: string;
  accountNumber: string;
  accountName: string;
};

function readEnv(environment: Record<string, string | undefined>, key: string): string {
  return environment[key]?.trim() ?? "";
}

/**
 * Rekening tujuan tunggal untuk pembayaran paket Tumbuh & Bisnis.
 * Diisi via env agar bisa diganti tanpa deploy ulang kode; fallback berupa
 * placeholder contoh yang wajib diganti di production.
 */
export function getBankTransferDestination(
  environment: Record<string, string | undefined> = process.env,
): BankTransferDestination {
  return {
    bank: readEnv(environment, "BANK_TRANSFER_BANK") || "BCA",
    accountNumber: readEnv(environment, "BANK_TRANSFER_ACCOUNT_NUMBER") || "1234567890",
    accountName: readEnv(environment, "BANK_TRANSFER_ACCOUNT_NAME") || "PT wazePOS",
  };
}

export function isBankTransferConfigured(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  const destination = getBankTransferDestination(environment);
  return Boolean(destination.bank && destination.accountNumber && destination.accountName);
}

export function formatBankTransferDestination(destination: BankTransferDestination): string {
  return `${destination.bank} ${destination.accountNumber} a.n. ${destination.accountName}`;
}
