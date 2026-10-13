import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function memberDisplayName(m: { first_name: string | null; last_name: string | null; preferred_name?: string | null }): string {
  return `${m.preferred_name || m.first_name || ""} ${m.last_name ?? ""}`.trim() || "Unnamed";
}

export function formString(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export function formBool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function toTitle(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
