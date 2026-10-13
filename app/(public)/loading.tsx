import { Skeleton } from "@/components/ui/display";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-4xl space-y-6 px-5 py-14 sm:px-8">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-64" />
    </div>
  );
}
