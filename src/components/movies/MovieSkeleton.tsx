"use client";

export function MovieGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MovieCardSkeleton() {
  return (
    <div className="skeletonCard" aria-hidden="true">
      <div className="skeletonPoster skeleton" />
      <div className="skeletonContent">
        <div className="skeletonTitle skeleton" />
        <div className="skeletonMeta skeleton" />
        <div className="skeletonLine skeleton" />
        <div className="skeletonLine skeleton" />
        <div className="skeletonLine short skeleton" />
      </div>
    </div>
  );
}

