type RouteLoadingProps = {
  label: string;
  variant: "pos" | "reports" | "management" | "inventory";
};

function SidebarSkeleton() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[#dfe8e3] bg-white lg:block">
      <div className="border-b border-[#edf2ee] p-5">
        <div className="h-9 w-32 rounded-xl bg-[#dfeae4]" />
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <div className="size-8 rounded-lg bg-[#e7f0eb]" />
            <div className="h-3.5 rounded-full bg-[#e7f0eb]" style={{ width: `${92 + (index % 3) * 18}px` }} />
          </div>
        ))}
      </div>
    </aside>
  );
}

function PageHeadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-36 rounded-full bg-[#dcebe3]" />
      <div className="h-10 w-[min(330px,80%)] rounded-xl bg-[#d7e6de]" />
      <div className="h-4 w-[min(560px,95%)] rounded-full bg-[#e2ece6]" />
    </div>
  );
}

function ContentSkeleton({ variant }: Pick<RouteLoadingProps, "variant">) {
  if (variant === "pos") {
    return (
      <>
        <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_390px]">
          <div className="h-[520px] rounded-2xl border border-[#e1ebe5] bg-white" />
          <div className="h-[520px] rounded-2xl border border-[#e1ebe5] bg-white" />
        </div>
        <div className="mt-7 h-64 rounded-2xl border border-[#e1ebe5] bg-white" />
      </>
    );
  }

  if (variant === "reports") {
    return (
      <>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl border border-[#e1ebe5] bg-white" />
          ))}
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-2xl border border-[#e1ebe5] bg-white" />
          <div className="h-80 rounded-2xl border border-[#e1ebe5] bg-white" />
        </div>
        <div className="mt-7 h-72 rounded-2xl border border-[#e1ebe5] bg-white" />
      </>
    );
  }

  if (variant === "inventory") {
    return (
      <>
        <div className="mt-7 h-80 rounded-2xl border border-[#e1ebe5] bg-white" />
        <div className="mt-7 h-96 rounded-2xl border border-[#e1ebe5] bg-white" />
        <div className="mt-7 h-72 rounded-2xl border border-[#e1ebe5] bg-white" />
      </>
    );
  }

  return (
    <>
      <div className="mt-7 h-44 rounded-2xl border border-[#e1ebe5] bg-white" />
      <div className="mt-7 h-[430px] rounded-2xl border border-[#e1ebe5] bg-white" />
    </>
  );
}

export function RouteLoading({ label, variant }: RouteLoadingProps) {
  return (
    <main
      className="flex min-h-dvh bg-[#f4faf7] text-[#15211d]"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Memuat halaman {label}...</span>
      <div className="flex w-full animate-pulse">
        <SidebarSkeleton />
        <div className="min-w-0 flex-1">
          <div className="h-16 border-b border-[#dfe8e3] bg-white px-4 py-3 sm:px-6">
            <div className="ml-auto h-10 w-40 rounded-xl bg-[#e7f0eb]" />
          </div>
          <section className="mx-auto w-[min(1140px,calc(100%-32px))] py-8 sm:py-10">
            <PageHeadingSkeleton />
            <ContentSkeleton variant={variant} />
          </section>
        </div>
      </div>
    </main>
  );
}
