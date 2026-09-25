import type { Metadata } from "next";
import { History } from "lucide-react";
import { PlatformAdminAuditList } from "@/components/admin/platform-admin-audit-list";
import { getPlatformAdminAuditData } from "@/lib/admin/platform-admin-audit-log";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Audit | Platform Admin wazePOS",
  description: "Jejak aktivitas internal admin wazePOS.",
  robots: { index: false, follow: false },
};

type AuditSearchParams = {
  q?: string | string[];
  action?: string | string[];
  page?: string | string[];
};

export default async function PlatformAdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  const params = await searchParams;
  const data = await getPlatformAdminAuditData({
    query: params.q,
    action: params.action,
    page: params.page,
  });

  return (
    <>
      <section className="mb-6 min-w-0 sm:mb-7">
        <Badge variant="outline" className="mb-3">
          <History className="size-3.5" /> Jejak audit
        </Badge>
        <h1 className="m-0 text-2xl font-black leading-tight tracking-[-0.7px] sm:text-3xl">
          Audit aktivitas admin
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069]">
          {data.pagination.total} aktivitas terekam dari pembukaan detail usaha dan ekspor direktori usaha, langganan, serta pembayaran. Halaman ini read-only.
        </p>
      </section>

      <PlatformAdminAuditList
        logs={data.logs}
        filters={data.filters}
        pagination={data.pagination}
        auditAvailable={data.auditAvailable}
        basePath="/admin/audit"
      />
    </>
  );
}
