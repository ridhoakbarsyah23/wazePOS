const pendingSaleStorageKey = "wazepos:pending-sale";

type SaleRequestPayload = {
  outletId: string;
  paymentMethod: "cash" | "qris" | "debit" | "credit";
  paidAmount: number;
  items: Array<{ productId: string; quantity: number }>;
};

type PendingSaleRequest = {
  clientRequestId: string;
  fingerprint: string;
};

type SaleRequestStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createSaleRequestFingerprint(payload: SaleRequestPayload) {
  return JSON.stringify({
    ...payload,
    items: [...payload.items].sort((a, b) => a.productId.localeCompare(b.productId)),
  });
}

export function getOrCreateSaleRequestId(
  storage: SaleRequestStorage,
  fingerprint: string,
  generateId: () => string = () => crypto.randomUUID(),
) {
  try {
    const stored = storage.getItem(pendingSaleStorageKey);
    if (stored) {
      const pending = JSON.parse(stored) as Partial<PendingSaleRequest>;
      if (
        pending.fingerprint === fingerprint &&
        typeof pending.clientRequestId === "string"
      ) {
        return pending.clientRequestId;
      }
    }
  } catch {
    storage.removeItem(pendingSaleStorageKey);
  }

  const clientRequestId = generateId();
  storage.setItem(
    pendingSaleStorageKey,
    JSON.stringify({ clientRequestId, fingerprint } satisfies PendingSaleRequest),
  );
  return clientRequestId;
}

export function clearSaleRequestId(
  storage: SaleRequestStorage,
  clientRequestId: string,
) {
  try {
    const stored = storage.getItem(pendingSaleStorageKey);
    if (!stored) return;

    const pending = JSON.parse(stored) as Partial<PendingSaleRequest>;
    if (pending.clientRequestId === clientRequestId) {
      storage.removeItem(pendingSaleStorageKey);
    }
  } catch {
    storage.removeItem(pendingSaleStorageKey);
  }
}
