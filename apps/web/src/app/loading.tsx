import { Card, CardContent, Skeleton } from '@vowgrid/ui';

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-4xl">
        <CardContent className="space-y-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
