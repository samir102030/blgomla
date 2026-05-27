import React from "react";

interface SkeletonProps {
  className?: string;
  /**
   * If true, render an inline-block so the skeleton sits next to text.
   * Default false → block-level.
   */
  inline?: boolean;
  /** Children only used when you want a roundedness/shape wrapper. */
  children?: React.ReactNode;
}

/**
 * Base skeleton block — a Tailwind-pulse div tinted to match the page's
 * surface-2 token (so it works in both light and dark themes without extra
 * variants). Use it directly for arbitrary shapes, or use the named
 * compositions below for common layouts.
 */
const Skeleton: React.FC<SkeletonProps> = ({ className = "", inline = false }) => (
  <div
    className={`${inline ? "inline-block" : "block"} bg-[var(--surface-2)] animate-pulse rounded ${className}`}
    aria-hidden="true"
  />
);

/** Product-card-shaped skeleton — image block + two title lines + a price line. */
export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
    <Skeleton className="aspect-square w-full mb-3" />
    <Skeleton className="h-3.5 w-3/4 mb-2" />
    <Skeleton className="h-3.5 w-1/2 mb-3" />
    <Skeleton className="h-5 w-1/3" />
  </div>
);

/** PDP-shaped skeleton — gallery + spec column. */
export const ProductDetailSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Gallery */}
      <div>
        <Skeleton className="aspect-square w-full mb-3" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-16 h-16" />
          ))}
        </div>
      </div>
      {/* Spec column */}
      <div>
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <Skeleton className="h-10 w-1/3 mb-3" />
        <Skeleton className="h-4 w-2/5 mb-6" />
        <div className="space-y-2 mb-6">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-12" />
        </div>
      </div>
    </div>
  </div>
);

export default Skeleton;
