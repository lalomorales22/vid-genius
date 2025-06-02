
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZoomIn, ZoomOut, Scissors, Undo, Redo, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Clip } from '@/app/page'; // Assuming Clip type is exported from page.tsx

interface TimelineControlsProps {
  selectedClip: Clip | null;
  onUpdateClipTimes: (clipId: string, newTimes: { sourceStart?: number; sourceEnd?: number }) => void;
}

export default function TimelineControls({ selectedClip, onUpdateClipTimes }: TimelineControlsProps) {
  const [tempStart, setTempStart] = useState<string>("");
  const [tempEnd, setTempEnd] = useState<string>("");

  useEffect(() => {
    if (selectedClip) {
      setTempStart(selectedClip.sourceStart.toFixed(2));
      setTempEnd(selectedClip.sourceEnd.toFixed(2));
    } else {
      setTempStart("");
      setTempEnd("");
    }
  }, [selectedClip]);

  const handleApplyClipTimes = () => {
    if (selectedClip) {
      const newStart = parseFloat(tempStart);
      const newEnd = parseFloat(tempEnd);
      
      const updates: { sourceStart?: number; sourceEnd?: number } = {};
      if (!isNaN(newStart) && newStart !== selectedClip.sourceStart) {
        updates.sourceStart = newStart;
      }
      if (!isNaN(newEnd) && newEnd !== selectedClip.sourceEnd) {
        updates.sourceEnd = newEnd;
      }
      
      if (Object.keys(updates).length > 0) {
        onUpdateClipTimes(selectedClip.id, updates);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-card border shadow-sm">
      <Button variant="outline" size="sm" disabled>
        <Undo className="mr-2 h-4 w-4" /> Undo
      </Button>
      <Button variant="outline" size="sm" disabled>
        <Redo className="mr-2 h-4 w-4" /> Redo
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
      <Button variant="outline" size="icon" aria-label="Cut selection" disabled>
        <Scissors className="h-4 w-4 text-destructive" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
      <Button variant="outline" size="icon" aria-label="Zoom In" disabled>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="icon" aria-label="Zoom Out" disabled>
        <ZoomOut className="h-4 w-4" />
      </Button>

      {selectedClip && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2 ml-2">
            <Label htmlFor="clipStart" className="text-xs">Start (s):</Label>
            <Input 
              id="clipStart" 
              type="number" 
              value={tempStart}
              onChange={(e) => setTempStart(e.target.value)}
              onBlur={handleApplyClipTimes} // Apply on blur as well
              className="h-8 w-20 text-xs"
              step="0.01"
              min="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="clipEnd" className="text-xs">End (s):</Label>
            <Input 
              id="clipEnd" 
              type="number" 
              value={tempEnd}
              onChange={(e) => setTempEnd(e.target.value)}
              onBlur={handleApplyClipTimes} // Apply on blur
              className="h-8 w-20 text-xs"
              step="0.01"
            />
          </div>
          <Button onClick={handleApplyClipTimes} size="sm" variant="outline" className="h-8">
            <Check className="mr-1 h-4 w-4" /> Update
          </Button>
        </>
      )}
    </div>
  );
}

    