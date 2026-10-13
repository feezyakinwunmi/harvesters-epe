import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/form-controls";
import { FilterToggle } from "@/components/admin/filter-toggle";

export type FilterField =
  | { type: "search"; name: string; placeholder: string }
  | { type: "select"; name: string; label: string; options: ReadonlyArray<{ value: string; label: string }> }
  | { type: "date"; name: string; label: string };

/**
 * GET-form filters: the URL is the state, so filtered views can be
 * bookmarked, shared and paginated on the server.
 */
export function FilterBar({ path, fields, values, keep = [] }: { path: string; fields: FilterField[]; values: Record<string, string | undefined>; keep?: string[] }) {
  const active = fields.some((f) => values[f.name]);
  const search = fields.filter((f) => f.type === "search");
  const others = fields.filter((f) => f.type !== "search");
  const activeOthers = others.filter((f) => values[f.name]).length;

  return (
    <form method="get" action={path} className="flex flex-wrap items-end gap-3 border-b border-line bg-canvas/40 px-4 py-3">
      {keep.map((k) => (values[k] ? <input key={k} type="hidden" name={k} value={values[k]} /> : null))}
      {search.map((f) => (
        <label key={f.name} className="relative min-w-0 flex-1 basis-full sm:basis-56">
          <span className="sr-only">{f.placeholder}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input type="search" name={f.name} defaultValue={values[f.name] ?? ""} placeholder={f.placeholder} className="h-10 rounded-full pl-10" />
        </label>
      ))}

      {others.length > 0 ? (
        <FilterToggle activeCount={activeOthers}>
          {others.map((f) => (
            <label key={f.name} className="min-w-0 md:min-w-36">
              <span className="mb-1 block text-xs font-semibold text-muted">{f.label}</span>
              {f.type === "select" ? (
                <Select name={f.name} defaultValue={values[f.name] ?? ""} className="h-10 text-sm">
                  <option value="">Any</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input type="date" name={f.name} defaultValue={values[f.name] ?? ""} className="h-10 text-sm" />
              )}
            </label>
          ))}
        </FilterToggle>
      ) : null}

      <div className="ml-auto flex gap-2 md:ml-0">
        <button type="submit" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-night-raised">
          Apply
        </button>
        {active ? (
          <Link href={path} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-muted hover:bg-fill hover:text-ink">
            <X className="size-4" aria-hidden /> Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
