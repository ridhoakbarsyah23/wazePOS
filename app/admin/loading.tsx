function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e7f0eb] ${className}`} />;
}

export default function PlatformAdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman Platform Admin...</span>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(210px,250px)] sm:items-end">
        <div className="space-y-3">
          <SkeletonBlock className="h-6 w-32 rounded-full" />
          <SkeletonBlock className="h-9 w-[min(420px,90%)] sm:h-11" />
          <SkeletonBlock className="h-4 w-[min(620px,95%)]" />
        </div>
        <SkeletonBlock className="h-24 w-full sm:h-28" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <SkeletonBlock key={index} className="h-[86px]" />)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}
