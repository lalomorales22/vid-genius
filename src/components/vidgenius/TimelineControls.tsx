
"use client";

import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Scissors, Undo, Redo } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function TimelineControls() {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border shadow-sm">
      <Button variant="outline" size="sm">
        <Undo className="mr-2 h-4 w-4" /> Undo
      </Button>
      <Button variant="outline" size="sm">
        <Redo className="mr-2 h-4 w-4" /> Redo
      </Button>
      <Separator orientation="vertical" className="h-6 mx-2" />
      <Button variant="outline" size="icon" aria-label="Cut selection">
        <Scissors className="h-4 w-4 text-destructive" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-2" />
      <Button variant="outline" size="icon" aria-label="Zoom In">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" aria-label="Zoom Out">
        <ZoomOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
