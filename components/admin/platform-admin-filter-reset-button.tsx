"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlatformAdminFilterResetButton({ formId, basePath = "/admin/businesses" }: { formId: string; basePath?: string }) {
  const router = useRouter();

  function handleReset() {
    const form = document.getElementById(formId);
    if (form instanceof HTMLFormElement) {
      form.reset();
    }
    router.replace(basePath);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleReset}
      aria-label="Reset filter"
      className="h-11 w-full gap-2 px-3 text-xs dark:border-[#303030] dark:bg-[#151515] dark:text-[#62d6a5] dark:hover:bg-[#202020] sm:w-auto [&_svg]:size-3.5"
    >
      <RotateCcw aria-hidden="true" />
      Reset
    </Button>
  );
}
