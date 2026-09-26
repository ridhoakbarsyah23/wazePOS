import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PlatformAdminPaymentList } from "@/components/admin/platform-admin-payment-list";
import { getPlatformAdminPaymentsData } from "@/server/admin/platform-admin-payments";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Pembayaran | Platform Admin wazePOS",
  description: "Daftar internal pembayaran langganan wazePOS.",
  robots: { index: false, follow: false },
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

type PaymentsSearchParams = {
  q?: string | string[];
  status?: string | string[];
  plan?: string | string[];
  page?: string | string[];
};

export default async function PlatformAdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<PaymentsSearchParams>;
}) {
  const params = await searchParams;
  const data = await getPlatformAdminPaymentsData({
    query: params.q,
    status: params.status,
    plan: params.plan,
    page: params.page,
  });

  return (
    <>
      <section className="mb-6 min-w-0 sm:mb-7">
        <Badge variant="outline" className="mb-3">
          <CreditCard className="size-3.5" /> Pembayaran
        </Badge>
        <h1 className="m-0 text-2xl font-black leading-tight tracking-[-0.7px] sm:text-3xl">
          Daftar pembayaran
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069]">
          {data.summary.paidPayments} pembayaran berhasil dengan total {formatRupiah(data.summary.paidRevenue)}. {data.summary.pendingPayments} menunggu pembayaran. Halaman ini read-only.
        </p>
      </section>

      <PlatformAdminPaymentList
        payments={data.payments}
        filters={data.filters}
        summary={data.summary}
        pagination={data.pagination}
        basePath="/admin/payments"
      />
    </>
  );
}
