import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/shared/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#23a473]/15 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#198760] text-white shadow-sm hover:bg-[#147554]",
        destructive: "bg-[#b42318] text-white hover:bg-[#912018]",
        outline: "border border-[#cfe3d9] bg-white text-[#106348] hover:bg-[#f1fbf6]",
        secondary: "bg-[#eaf7f0] text-[#106348] hover:bg-[#d9f0e4]",
        ghost: "text-[#496058] hover:bg-[#eef7f2] hover:text-[#106348]",
        link: "h-auto text-[#198760] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 px-5",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
