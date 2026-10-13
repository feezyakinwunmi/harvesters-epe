import { Skeleton } from "@/components/ui/display";

export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
