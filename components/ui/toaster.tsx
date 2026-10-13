"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-md !border !border-line !bg-surface !text-ink !shadow-soft !font-sans",
          description: "!text-muted",
        },
      }}
    />
  );
}
