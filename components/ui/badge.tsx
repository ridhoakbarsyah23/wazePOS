import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/utils";

const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "bg-[#eaf7f0] text-[#198760] dark:bg-[#12382a] dark:text-[#62d6a5]",
      secondary: "bg-[#eef2f0] text-[#4d5e57] dark:bg-[#1a1a1a] dark:text-[#d4d4d4]",
      warning: "bg-[#fff0e5] text-[#a35f12] dark:bg-[#3a2614] dark:text-[#f6b86a]",
      destructive: "bg-[#feeceb] text-[#b42318] dark:bg-[#3a1715] dark:text-[#ff9b91]",
      outline: "border border-[#dfe8e3] bg-white text-[#4d5e57] dark:border-[#303030] dark:bg-[#111111] dark:text-[#d4d4d4]",
    },
  },
  defaultVariants: { variant: "default" },
});

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
