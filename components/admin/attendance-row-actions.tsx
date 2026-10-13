"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";
import { correctAttendance, removeAttendance } from "@/lib/actions/attendance-admin";
import { cn } from "@/lib/utils";

export function AttendanceRowActions({ id, mode, checkedInLocal, name, className }: { id: string; mode: string; checkedInLocal: string; name: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("flex justify-end gap-1", className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`Correct attendance for ${name}`}><Pencil aria-hidden /> Correct</Button>
        </DialogTrigger>
        <DialogContent title="Correct attendance" description={`${name}. The change and your reason are saved in the audit log.`}>
          <ActionForm action={correctAttendance} className="space-y-4" onSuccess={() => setOpen(false)}>
            {(state) => (
              <>
                <input type="hidden" name="attendance_id" value={id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`m-${id}`} label="Attended">
                    <Select name="mode" defaultValue={mode}>
                      <option value="physical">In person</option>
                      <option value="online">Online</option>
                    </Select>
                  </Field>
                  <Field id={`t-${id}`} label="Check-in time">
                    <Input type="datetime-local" name="checked_in_at" defaultValue={checkedInLocal} />
                  </Field>
                </div>
                <Field id={`r-${id}`} label="Reason" error={state.fieldErrors?.reason}>
                  <Textarea name="reason" rows={2} maxLength={500} />
                </Field>
                <div className="flex justify-end"><SubmitButton>Save correction</SubmitButton></div>
              </>
            )}
          </ActionForm>
        </DialogContent>
      </Dialog>
      <ConfirmAction
        action={removeAttendance}
        hidden={{ attendance_id: id }}
        title="Remove this attendance record?"
        description={`Use this only if ${name} was recorded by mistake. The removal is audited with your reason.`}
        confirmLabel="Remove record"
        trigger="Remove"
        triggerVariant="ghost"
        destructive
        reason={{ label: "Reason", required: true, placeholder: "Recorded for the wrong person" }}
      />
    </div>
  );
}
