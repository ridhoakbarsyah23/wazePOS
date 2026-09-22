import { PosPageContent } from "@/components/pos-page-content";

export default async function OutletPosPage({
  params,
}: {
  params: Promise<{ outletSlug: string }>;
}) {
  const { outletSlug } = await params;
  return <PosPageContent outletSlug={outletSlug} />;
}
