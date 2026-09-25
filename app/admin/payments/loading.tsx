function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e7f0eb] ${className}`} />;
}

export default function PlatformAdminPaymentsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat daftar pembayaran...</span>
      <div className="mb-6 space-y-3 sm:mb-7">
        <SkeletonBlock className="h-6 w-32 rounded-full" />
        <SkeletonBlock className="h-9 w-[min(360px,90%)] sm:h-11" />
        <SkeletonBlock className="h-4 w-[min(620px,95%)]" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white">
        <div className="space-y-2 border-b border-[#e8efeb] p-4 sm:p-5">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-3 w-64 max-w-full" />
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-20 w-full" />)}
        </div>
      </div>
    </div>
  );
}
