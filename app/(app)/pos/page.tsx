import { PosPageContent } from "@/components/pos/pos-page-content";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const query = await searchParams;
  return <PosPageContent legacyOutletId={query.outlet} />;
}
