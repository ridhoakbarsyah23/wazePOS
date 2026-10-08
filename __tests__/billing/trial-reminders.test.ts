import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    transaction: mocks.transaction,
    select: mocks.select,
    update: mocks.update,
  },
}));

vi.mock("@/server/email/trial-ending-email", () => ({
  getUpgradeUrl: vi.fn(() => "https://pos.example.com/subscription"),
  sendTrialEndingEmail: mocks.sendEmail,
}));

import {
  findTrialRemindersDue,
  sendTrialReminders,
} from "@/server/billing/trial-reminders";

function selectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    then: (onFulfilled: (value: unknown[]) => unknown) => Promise.resolve(rows).then(onFulfilled),
  };
  return chain;
}

function updateChain(returningRows: unknown[] = []) {
  const chain = {
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(async () => returningRows),
  };
  return chain;
}

const dueRow = {
  businessId: "business-1",
  businessName: "Toko Makmur",
  trialEndsAt: new Date("2026-09-29T03:00:00.000Z"),
  ownerEmail: "owner@example.com",
  ownerName: "Owner",
};

describe("pencarian langganan yang jatuh tempo pengingat", () => {
  it("membatasi query ke trial aktif > sekarang dan <= 24 jam yang belum dikirim", async () => {
    const chain = selectChain([]);
    mocks.select.mockReturnValue(chain);
    const now = new Date("2026-09-28T02:00:00.000Z");
    await findTrialRemindersDue(now);

    const condition = vi.mocked(chain.where).mock.calls[0] as unknown as [Parameters<PgDialect["sqlToQuery"]>[0]];
    const query = new PgDialect().sqlToQuery(condition[0]);
    expect(query.sql).toContain('"subscription"."status" =');
    expect(query.sql).toContain('"subscription"."trial_reminder_sent_at" is null');
    expect(query.sql).toContain('"subscription"."trial_ends_at" >');
    expect(query.sql).toContain('"subscription"."trial_ends_at" <=');
    expect(query.params).toEqual([
      "trialing", "2026-09-28T02:00:00.000Z", "2026-09-29T02:00:00.000Z",
    ]);
  });

  it("mengembalikan penerima dari hasil join", async () => {
    mocks.select.mockReturnValue(selectChain([dueRow]));

    const recipients = await findTrialRemindersDue();

    expect(recipients).toEqual([
      {
        businessId: "business-1",
        businessName: "Toko Makmur",
        trialEndsAt: dueRow.trialEndsAt,
        ownerEmail: "owner@example.com",
        ownerName: "Owner",
      },
    ]);
  });

  it("mengembalikan array kosong bila tidak ada yang jatuh tempo", async () => {
    mocks.select.mockReturnValue(selectChain([]));

    await expect(findTrialRemindersDue()).resolves.toEqual([]);
  });
});

describe("pengiriman pengingat trial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback({ update: mocks.update }));
    mocks.select.mockReturnValue(selectChain([dueRow]));
  });

  it("mengklaim langganan, mengirim email, dan menandai terkirim", async () => {
    const claim = updateChain([{ id: "subscription-1" }]);
    mocks.update.mockReturnValue(claim);
    mocks.sendEmail.mockResolvedValue({ messageId: "email-1" });

    const result = await sendTrialReminders({ now: new Date("2026-09-28T02:00:00.000Z") });

    expect(result).toEqual({
      sent: 1,
      failed: 0,
      skipped: 0,
      messages: [{ businessId: "business-1", trialEndsAt: "2026-09-29T03:00:00.000Z", messageId: "email-1" }],
      failures: [],
    });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail.mock.calls[0]?.[0]).toMatchObject({
      recipient: "owner@example.com",
      businessName: "Toko Makmur",
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.sendEmail.mock.calls[0]?.[0].idempotencyKey).toBe(
      "trial-ending/subscription-1/2026-09-29T03:00:00.000Z",
    );
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("meneruskan kegagalan ke transaksi untuk rollback dan menghitung gagal", async () => {
    const claim = updateChain([{ id: "subscription-1" }]);
    mocks.update.mockReturnValue(claim);
    mocks.sendEmail.mockRejectedValue(new Error("Resend down"));

    const result = await sendTrialReminders();

    expect(result).toEqual({
      sent: 0,
      failed: 1,
      skipped: 0,
      messages: [],
      failures: [{ businessId: "business-1", trialEndsAt: "2026-09-29T03:00:00.000Z", reason: "EMAIL_SEND_FAILED" }],
    });
    await expect(mocks.transaction.mock.results[0].value).rejects.toThrow("Resend down");
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("melewati penerima yang sudah diklaim eksekusi lain", async () => {
    const claim = updateChain([]);
    mocks.update.mockReturnValue(claim);

    const result = await sendTrialReminders();

    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1, messages: [], failures: [] });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
