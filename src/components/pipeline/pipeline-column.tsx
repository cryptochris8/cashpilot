"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PipelineCard, type PipelineCardData } from "./pipeline-card";
import { formatCurrency } from "@/lib/utils/format";

interface PipelineColumnProps {
  stage: string;
  label: string;
  color: string;
  cards: PipelineCardData[];
  count: number;
  totalBalance: number;
  onCardClick: (id: string) => void;
  onDrop: (invoiceId: string, newStage: string) => void;
  selectedIds: Set<string>;
  onSelectToggle: (id: string) => void;
}

export function PipelineColumn({
  stage,
  label,
  color,
  cards,
  count,
  totalBalance,
  onCardClick,
  onDrop,
  selectedIds,
  onSelectToggle,
}: PipelineColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="w-72 flex-shrink-0">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold">{label}</h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {count}
        </Badge>
      </div>
      <div className="mb-2 text-xs text-muted-foreground">
        Total: {formatCurrency(totalBalance)}
      </div>

      <div
        className={`min-h-[100px] space-y-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-transparent"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const invoiceId = e.dataTransfer.getData("text/plain");
          if (invoiceId) {
            onDrop(invoiceId, stage);
          }
        }}
      >
        {cards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex h-20 items-center justify-center p-4">
              <p className="text-xs text-muted-foreground">
                No invoices in this stage
              </p>
            </CardContent>
          </Card>
        ) : (
          cards.map((card) => (
            <PipelineCard
              key={card.id}
              card={card}
              onClick={onCardClick}
              selected={selectedIds.has(card.id)}
              onSelectToggle={onSelectToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}
