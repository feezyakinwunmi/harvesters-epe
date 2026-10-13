"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/**
 * Slide-in panel built on Radix Dialog: focus is trapped, Escape and the
 * backdrop close it, and page scroll is locked while it's open.
 */
export function Drawer({
  open,
  onOpenChange,
  side = "right",
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="hc-overlay fixed inset-0 z-50 bg-night/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[min(86vw,340px)] flex-col overflow-y-auto focus:outline-none",
            side === "right" ? "hc-drawer-right right-0" : "hc-drawer-left left-0",
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DrawerClose = DialogPrimitive.Close;
