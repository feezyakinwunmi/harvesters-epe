"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm",
};
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 15 * 1024 * 1024;

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/church-public-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Uploads straight from the browser to the public media bucket (Storage RLS
 * only allows content/super admins, under content/ or recognitions/).
 * The chosen paths are submitted with the surrounding form.
 */
export function MediaUploader({
  name,
  initial = [],
  multiple = false,
  allowVideo = false,
  prefix = "content",
  label,
}: {
  name: string;
  initial?: string[];
  multiple?: boolean;
  allowVideo?: boolean;
  prefix?: "content" | "recognitions";
  label: string;
}) {
  const [paths, setPaths] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const accept = [...IMAGE_TYPES, ...(allowVideo ? VIDEO_TYPES : [])];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = multiple ? Array.from(files).slice(0, 20) : [files[0]!];
    const supabase = createClient();
    for (const file of list) {
      if (!accept.includes(file.type)) {
        toast.error(`${file.name}: use ${allowVideo ? "JPG, PNG, WebP, GIF, MP4 or WebM" : "JPG, PNG, WebP or GIF"}.`);
        continue;
      }
      const limit = file.type.startsWith("video/") ? MAX_VIDEO : MAX_IMAGE;
      if (file.size > limit) {
        toast.error(`${file.name} is over ${limit / 1024 / 1024} MB.`);
        continue;
      }
      const d = new Date();
      const path = `${prefix}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${EXT[file.type]}`;
      setBusy((b) => b + 1);
      const { error } = await supabase.storage.from("church-public-media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      setBusy((b) => b - 1);
      if (error) {
        toast.error(`${file.name} didn't upload. ${error.message.includes("row-level") ? "Your role can't upload media." : "Please try again."}`);
        continue;
      }
      setPaths((p) => (multiple ? [...p, path] : [path]));
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <input type="hidden" name={name} value={multiple ? JSON.stringify(paths) : (paths[0] ?? "")} />
      {paths.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {paths.map((p) => (
            <li key={p} className="group relative overflow-hidden rounded-sm border border-line bg-fill">
              {/\.(mp4|webm)$/i.test(p) ? (
                <video src={publicUrl(p)} className="aspect-square w-full object-cover" muted preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicUrl(p)} alt="" className="aspect-square w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => setPaths((list) => list.filter((x) => x !== p))}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                aria-label="Remove file"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input ref={input} type="file" className="sr-only" accept={accept.join(",")} multiple={multiple} onChange={(e) => upload(e.target.files)} />
      <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy > 0}>
        {busy > 0 ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
        {busy > 0 ? `Uploading ${busy}…` : paths.length && !multiple ? "Replace" : multiple ? "Add files" : "Upload"}
      </Button>
      <p className="text-xs text-muted">
        Images up to 10 MB{allowVideo ? ", videos up to 15 MB (use YouTube for longer recordings)" : ""}. Removed files are deleted when you save.
      </p>
    </div>
  );
}
