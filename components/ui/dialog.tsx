"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const overlay = "hc-overlay fixed inset-0 z-40 bg-night/50 backdrop-blur-[2px]";
const content =
  "hc-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border border-line bg-surface p-5 shadow-lift focus:outline-none max-h-[calc(100dvh-2rem)] overflow-y-auto sm:p-6";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ title, description, children, className }: { title: string; description?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content className={cn(content, className)}>
        <div className="mb-5 pr-8">
          <DialogPrimitive.Title className="text-h3 font-bold text-ink">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description> : null}
        </div>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 text-muted hover:bg-fill hover:text-ink" aria-label="Close">
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;
export const AlertDialogCancel = AlertPrimitive.Cancel;

export function AlertDialogContent({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className={overlay} />
      <AlertPrimitive.Content className={content}>
        <AlertPrimitive.Title className="text-h3 font-bold text-ink">{title}</AlertPrimitive.Title>
        {description ? <AlertPrimitive.Description className="mt-1.5 text-sm leading-relaxed text-muted">{description}</AlertPrimitive.Description> : null}
        <div className="mt-5">{children}</div>
      </AlertPrimitive.Content>
    </AlertPrimitive.Portal>
  );
}
