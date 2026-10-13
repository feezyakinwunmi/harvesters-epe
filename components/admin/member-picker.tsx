"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { searchMembers, type MemberOption } from "@/lib/actions/lookup";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

/**
 * Accessible type-ahead (combobox pattern). Submits the chosen member's id
 * in a hidden input named `name`.
 */
export function MemberPicker({
  name,
  label = "Member",
  defaultValue,
  onChange,
  requirePhotoConsent = false,
  error,
}: {
  name: string;
  label?: string;
  defaultValue?: MemberOption | null;
  onChange?: (m: MemberOption | null) => void;
  requirePhotoConsent?: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [selected, setSelected] = useState<MemberOption | null>(defaultValue ?? null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const id = useId();
  const listId = `${id}-list`;
  const seq = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await searchMembers(query);
      if (mine === seq.current) {
        setResults(r);
        setActive(0);
        setLoading(false);
        setOpen(true);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  function choose(m: MemberOption) {
    if (requirePhotoConsent && !m.photoConsent) return;
    setSelected(m);
    onChange?.(m);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={`${id}-input`} className="text-sm font-semibold text-ink">{label}</label>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex h-10 items-center justify-between rounded-sm border border-line-strong bg-surface px-3">
          <span className="truncate text-[15px] text-ink">
            {selected.name} <span className="text-sm text-muted tabular-nums">{selected.memberNumber}</span>
          </span>
          <button type="button" onClick={() => { setSelected(null); onChange?.(null); }} className="rounded-sm p-1 text-muted hover:bg-fill hover:text-ink" aria-label="Clear member">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            id={`${id}-input`}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
            aria-invalid={error ? true : undefined}
            className="pl-9"
            placeholder="Type a name, phone or member number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); choose(results[active]!); }
              else if (e.key === "Escape") setOpen(false);
            }}
            autoComplete="off"
          />
          {open ? (
            <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-sm border border-line bg-surface py-1 shadow-soft">
              {loading && results.length === 0 ? <li className="px-3 py-2 text-sm text-muted">Searching…</li> : null}
              {!loading && results.length === 0 ? <li className="px-3 py-2 text-sm text-muted">No one found</li> : null}
              {results.map((m, i) => {
                const disabled = requirePhotoConsent && !m.photoConsent;
                return (
                  <li
                    key={m.id}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={disabled || undefined}
                    onMouseDown={(e) => { e.preventDefault(); choose(m); }}
                    onMouseEnter={() => setActive(i)}
                    className={cn("flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm", i === active && "bg-fill", disabled && "cursor-not-allowed opacity-50")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{m.name}</span>
                      <span className="block text-xs text-muted tabular-nums">
                        {m.memberNumber}
                        {m.phoneLast4 ? ` · phone ends ${m.phoneLast4}` : ""}
                        {disabled ? " · no photo/recognition consent" : ""}
                      </span>
                    </span>
                    {i === active && !disabled ? <Check className="size-4 text-muted" aria-hidden /> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
      {error ? <p role="alert" className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
