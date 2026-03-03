import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Collection Pipeline
        </h1>
        <p className="text-muted-foreground">
          Track invoices through your collection workflow. Drag cards between
          columns to change stages. Ctrl+click to select multiple cards for
          bulk actions.
        </p>
      </div>

      <PipelineBoard />
    </div>
  );
}
