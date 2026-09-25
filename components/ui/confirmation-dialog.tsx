"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/shared/utils";

type ConfirmationDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  disabled = false,
  destructive = true,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="p-6 sm:p-7">
          <AlertDialogHeader>
            <div
              className={cn(
                "mx-auto mb-2 grid size-12 place-items-center rounded-2xl sm:mx-0",
                destructive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-[#198760]",
              )}
            >
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel disabled={disabled}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={onConfirm}
              className={cn(
                destructive && "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600",
              )}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
