"use client";

import * as React from "react";
import { cn } from "@/lib/shared/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;
  const baseId = React.useId();

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, baseId }}>
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="tablist"
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl bg-[#f0f4f2] p-1 text-[#627069]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within a Tabs component");

  const isSelected = context.value === value;
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    const list = event.currentTarget.closest('[role="tablist"]');
    const triggers = Array.from(list?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') ?? []);
    if (!triggers.length) return;
    event.preventDefault();
    const currentIndex = triggers.indexOf(event.currentTarget);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? triggers.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % triggers.length
          : (currentIndex - 1 + triggers.length) % triggers.length;
    const nextTrigger = triggers[nextIndex];
    nextTrigger?.focus();
    const nextValue = nextTrigger?.getAttribute("data-tabs-value");
    if (nextValue) context.onValueChange(nextValue);
  };

  return (
    <button
      type="button"
      role="tab"
      id={`${context.baseId}-tab-${value}`}
      aria-controls={`${context.baseId}-panel-${value}`}
      aria-selected={isSelected}
      data-tabs-value={value}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760] disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-white text-[#198760] shadow-xs"
          : "text-[#627069] hover:text-[#15211d] hover:bg-white/40",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within a Tabs component");

  if (context.value !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${context.baseId}-panel-${value}`}
      aria-labelledby={`${context.baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("mt-2 ring-offset-white focus-visible:outline-none animate-fade-in", className)}
    >
      {children}
    </div>
  );
}
