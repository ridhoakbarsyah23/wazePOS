import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" type={type} className={cn("flex h-11 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 text-sm text-[#15211d] outline-none transition placeholder:text-[#87928d] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
}

export { Input };
