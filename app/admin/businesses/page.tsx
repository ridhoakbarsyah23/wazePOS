import type { Metadata } from "next";
import { Building2, ListFilter } from "lucide-react";
import { PlatformAdminBusinessList } from "@/components/admin/platform-admin-business-list";
import { getPlatformAdminDirectoryData } from "@/server/admin/platform-admin-dashboard";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Daftar Usaha | Platform Admin wazePOS",
  description: "Direktori internal usaha, owner, dan status subscription wazePOS.",
  robots: { index: false, follow: false },
};

type BusinessesSearchParams = {
  q?: string | string[];
  status?: string | string[];
  businessType?: string | string[];
  plan?: string | string[];
  onboarding?: string | string[];
  registeredFrom?: string | string[];
  registeredTo?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

export default async function PlatformAdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<BusinessesSearchParams>;
}) {
  const params = await searchParams;
  const data = await getPlatformAdminDirectoryData({
    query: params.q,
    status: params.status,
    businessType: params.businessType,
    plan: params.plan,
    onboarding: params.onboarding,
    registeredFrom: params.registeredFrom,
    registeredTo: params.registeredTo,
    sort: params.sort,
    page: params.page,
  });

  return (
    <>
      <section className="mb-6 min-w-0 sm:mb-7">
        <Badge variant="outline" className="mb-3">
          <Building2 className="size-3.5" /> Direktori usaha
        </Badge>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-black leading-tight tracking-[-0.7px] sm:text-3xl">
          <ListFilter className="size-6 text-[#198760]" aria-hidden="true" />
          Daftar usaha
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069]">
          Cari usaha berdasarkan nama, owner, atau email. Filter status, paket, onboarding, dan rentang pendaftaran.
        </p>
      </section>

      <PlatformAdminBusinessList
        businesses={data.businesses}
        filters={data.filters}
        overview={data.overview}
        directory={data.directory}
        basePath="/admin/businesses"
      />
    </>
  );
}
