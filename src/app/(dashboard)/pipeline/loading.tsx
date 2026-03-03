import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PipelineLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {[0,1,2,3,4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[0,1,2].map((j) => (
                <Skeleton key={j} className="h-24 w-full rounded-md" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}