"use client";
import { useState } from "react";
import { ClipboardPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose } from "@/components/ui/drawer";
import { RecordAttendanceForm } from "@/components/admin/record-attendance-form";

type ServiceOption = { id: string; label: string; allowOnline: boolean };

/** Below 2xl the usher form opens in a slide-in panel instead of a sidebar. */
export function RecordAttendanceDrawer({ services, defaultServiceId }: { services: ServiceOption[]; defaultServiceId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} className="2xl:hidden">
        <ClipboardPlus className="text-gold-light" aria-hidden /> Record attendance
      </Button>
      <Drawer open={open} onOpenChange={setOpen} side="right" title="Record attendance" className="w-[min(100vw,420px)] bg-surface">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface px-5 py-4">
          <div>
            <p className="text-h3 font-bold text-ink">Record attendance</p>
            <p className="mt-0.5 text-sm text-muted">Usher-assisted or manual. A reason is required.</p>
          </div>
          <DrawerClose className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-fill">
            <X className="size-4" aria-hidden />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </div>
        <div className="px-5 py-5">
          <RecordAttendanceForm services={services} defaultServiceId={defaultServiceId} />
        </div>
      </Drawer>
    </>
  );
}
