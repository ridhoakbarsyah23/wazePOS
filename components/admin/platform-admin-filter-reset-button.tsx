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
      className="h-9 gap-2 text-xs"
    >
      <RotateCcw className="size-3.5" aria-hidden="true" />
      Reset
    </Button>
  );
}
