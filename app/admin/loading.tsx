function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e7f0eb] ${className}`} />;
}

export default function PlatformAdminLoading() {
  return (
    <main id="admin-content" tabIndex={-1} className="min-h-dvh overflow-x-hidden bg-[#f3f7f5] text-[#15211d] focus:outline-none" aria-busy="true" aria-live="polite">
      <a href="#admin-content" className="skip-link">Lewati ke konten</a>
      <span className="sr-only">Memuat halaman Platform Admin...</span>
      <header className="border-b border-[#dfe8e3] bg-white/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 w-[min(1440px,calc(100%-24px))] items-center justify-between sm:w-[min(1440px,calc(100%-40px))]">
          <SkeletonBlock className="h-6 w-24 sm:h-7 sm:w-28" />
          <SkeletonBlock className="h-9 w-24" />
        </div>
      </header>
      <div className="mx-auto w-[min(1440px,calc(100%-24px))] pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[min(1440px,calc(100%-40px))] sm:pt-8 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pt-10 lg:pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
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
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white sm:mt-7">
          <div className="flex flex-col gap-4 border-b border-[#e8efeb] p-4 sm:p-5">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-3 w-64 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
              <SkeletonBlock className="col-span-2 h-11 sm:col-span-1 sm:h-10" />
              <SkeletonBlock className="h-11 sm:h-10" />
              <SkeletonBlock className="h-11 w-full sm:h-10 sm:w-24" />
            </div>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={index} className="h-20 w-full" />)}
          </div>
        </div>
      </div>
    </main>
  );
}
