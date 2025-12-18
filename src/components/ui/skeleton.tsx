import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}

function StoreSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-xl border bg-card">
      <Skeleton className="h-20 w-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

function BannerSkeleton() {
  return <Skeleton className="h-36 w-full rounded-2xl" />;
}

export { Skeleton, StoreSkeleton, ProductSkeleton, BannerSkeleton };
