import type { Metadata } from "next";
import { Inbox, ListFilter } from "lucide-react";
import { PlatformAdminLeadList } from "@/components/admin/platform-admin-lead-list";
import { Badge } from "@/components/ui/badge";
import { getPlatformAdminLeadData } from "@/server/admin/platform-admin-leads";

export const metadata: Metadata = {
  title: "Leads | Dashboard Admin wazePOS",
  description: "Daftar lead marketing yang masuk dari website wazePOS.",
  robots: { index: false, follow: false },
};

type LeadsSearchParams = {
  q?: string | string[];
  source?: string | string[];
  status?: string | string[];
  followUp?: string | string[];
  createdFrom?: string | string[];
  createdTo?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

export default async function PlatformAdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadsSearchParams>;
}) {
  const params = await searchParams;
  const data = await getPlatformAdminLeadData({
    q: params.q,
    source: params.source,
    status: params.status,
    followUp: params.followUp,
    createdFrom: params.createdFrom,
    createdTo: params.createdTo,
    sort: params.sort,
    page: params.page,
  });

  return (
    <>
      <section className="mb-6 min-w-0 sm:mb-7">
        <Badge variant="outline" className="mb-3">
          <Inbox className="size-3.5" /> Lead marketing
        </Badge>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-black leading-tight tracking-[-0.7px] text-[#15211d] dark:text-white sm:text-3xl">
          <ListFilter className="size-6 text-[#198760] dark:text-[#62d6a5]" aria-hidden="true" />
          Daftar lead
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069] dark:text-[#a3a3a3]">
          Pantau calon pelanggan dari form website, cek kebutuhan usaha, dan hubungi langsung melalui WhatsApp.
        </p>
      </section>

      <PlatformAdminLeadList
        leads={data.leads}
        filters={data.filters}
        summary={data.summary}
        pagination={data.pagination}
        basePath="/admin/leads"
      />
    </>
  );
}
