import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils";

const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "bg-[#eaf7f0] text-[#198760]",
      secondary: "bg-[#eef2f0] text-[#4d5e57]",
      warning: "bg-[#fff0e5] text-[#a35f12]",
      destructive: "bg-[#feeceb] text-[#b42318]",
      outline: "border border-[#dfe8e3] bg-white text-[#4d5e57]",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
