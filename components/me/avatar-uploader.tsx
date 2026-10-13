"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { removeMyProfilePhoto, setMyProfilePhoto } from "@/lib/actions/profile";
import { Avatar } from "@/components/ui/display";
import { Button } from "@/components/ui/button";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function AvatarUploader({ userId, src, initials }: { userId: string; src: string | null; initials: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(src);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return toast.error("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("That photo is over 5 MB. Try a smaller one.");
    setBusy(true);
    try {
      const path = `${userId}/avatar-${crypto.randomUUID()}.${EXT[file.type]}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("member-avatars").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (error) throw error;
      const res = await setMyProfilePhoto(path);
      if (!res.ok) {
        await supabase.storage.from("member-avatars").remove([path]);
        throw new Error(res.message);
      }
      setPreview(URL.createObjectURL(file));
      toast.success("Photo updated");
      startTransition(() => router.refresh());
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const res = await removeMyProfilePhoto();
    setBusy(false);
    if (res.ok) {
      setPreview(null);
      toast.success("Photo removed");
      startTransition(() => router.refresh());
    } else toast.error(res.message ?? "Couldn't remove the photo.");
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={preview} initials={initials} size={72} />
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept={ACCEPT.join(",")} className="sr-only" id="avatar-file" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <Camera aria-hidden /> {busy ? "Uploading…" : preview ? "Change photo" : "Add a photo"}
        </Button>
        {preview ? (
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
            <Trash2 aria-hidden /> Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
