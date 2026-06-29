'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AnalysisSkeleton() {
  return (
    <div className="w-full space-y-4 animate-fade-in-up">
      {/* Summary skeleton */}
      <Card className="border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </Card>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-3 text-center">
            <Skeleton className="mx-auto mb-1 h-3.5 w-3.5 rounded" />
            <Skeleton className="mx-auto h-5 w-8" />
            <Skeleton className="mx-auto h-2 w-12" />
          </Card>
        ))}
      </div>

      {/* Fallacy card skeleton */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-14 w-14 rounded-full" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </Card>

      {/* Argument structure skeleton */}
      <Card className="p-4 sm:p-5">
        <Skeleton className="mb-3 h-4 w-40" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg bg-card/40 p-3">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="mt-1.5 h-2 w-4/5" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
