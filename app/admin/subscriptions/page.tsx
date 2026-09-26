import type { Metadata } from "next";
import { Repeat2 } from "lucide-react";
import { PlatformAdminSubscriptionList } from "@/components/admin/platform-admin-subscription-list";
import { getPlatformAdminSubscriptionsData } from "@/server/admin/platform-admin-subscriptions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Langganan | Platform Admin wazePOS",
  description: "Daftar internal status trial dan langganan usaha wazePOS.",
  robots: { index: false, follow: false },
};

type SubscriptionsSearchParams = {
  q?: string | string[];
  state?: string | string[];
  plan?: string | string[];
  page?: string | string[];
};

export default async function PlatformAdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SubscriptionsSearchParams>;
}) {
  const params = await searchParams;
  const data = await getPlatformAdminSubscriptionsData({
    query: params.q,
    state: params.state,
    plan: params.plan,
    page: params.page,
  });

  return (
    <>
      <section className="mb-6 min-w-0 sm:mb-7">
        <Badge variant="outline" className="mb-3">
          <Repeat2 className="size-3.5" /> Langganan
        </Badge>
        <h1 className="m-0 text-2xl font-black leading-tight tracking-[-0.7px] sm:text-3xl">
          Daftar langganan
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069]">
          {data.summary.total} langganan terdaftar. {data.summary.trialEndingSoon} trial berakhir dalam 7 hari. Halaman ini read-only.
        </p>
      </section>

      <PlatformAdminSubscriptionList
        subscriptions={data.subscriptions}
        filters={data.filters}
        summary={data.summary}
        pagination={data.pagination}
        basePath="/admin/subscriptions"
      />
    </>
  );
}
