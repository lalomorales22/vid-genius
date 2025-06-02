
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GripVertical, Film, Music2, MessageSquareText } from "lucide-react"; // Updated icon
import React, { useRef } from "react";
import type { Track, Clip } from "@/app/page"; 
import { cn } from "@/lib/utils";

interface TimelineTrackDisplayProps {
  track: Track;
  projectDuration: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string) => void;
  onUpdateClipTimes: (clipId: string, newTimes: { timelineStart?: number; sourceStart?: number; sourceEnd?: number }) => void;
  globalCurrentTime: number;
}

const getIconForTrackType = (type: 'video' | 'audio' | 'caption') => {
  switch (type) {
    case 'video':
      return <Film className="h-5 w-5 text-blue-500" />;
    case 'audio':
      return <Music2 className="h-5 w-5 text-green-500" />;
    case 'caption':
      return <MessageSquareText className="h-5 w-5 text-yellow-600" />;
    default:
      return null;
  }
};

const getBgColorForTrackType = (type: 'video' | 'audio' | 'caption') => {
  switch (type) {
    case 'video':
      return "bg-blue-500/10";
    case 'audio':
      return "bg-green-500/10";
    case 'caption':
      return "bg-yellow-500/10"; 
    default:
      return "bg-muted/30";
  }
}

const TimelineTrackDisplay: React.FC<TimelineTrackDisplayProps> = ({ track, projectDuration, selectedClipId, onClipSelect, onUpdateClipTimes }) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleClipDragStart = (e: React.DragEvent<HTMLDivElement>, clipId: string) => {
    e.dataTransfer.setData("clipId", clipId);
    e.dataTransfer.setData("initialTimelineStart", track.clips.find(c => c.id === clipId)?.timelineStart.toString() || "0");
    e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnTrack = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData("clipId");
    // const initialTimelineStart = parseFloat(e.dataTransfer.getData("initialTimelineStart"));
    
    if (!clipId || !trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const dropX = e.clientX - trackRect.left;
    const trackWidth = trackRect.width;
    
    const newTimelineStart = Math.max(0, (dropX / trackWidth) * projectDuration);

    const clipBeingMoved = tracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (!clipBeingMoved) return;
    
    // Ensure the clip doesn't extend beyond project duration if moved (optional, based on desired behavior)
    // const clipDuration = clipBeingMoved.sourceEnd - clipBeingMoved.sourceStart;
    // const newTimelineEnd = newTimelineStart + clipDuration;
    // if (newTimelineEnd > projectDuration) {
    //   newTimelineStart = Math.max(0, projectDuration - clipDuration);
    // }

    onUpdateClipTimes(clipId, { timelineStart: newTimelineStart });
  };


  return (
    <div 
      className={`flex items-stretch border-b last:border-b-0 ${getBgColorForTrackType(track.type)}`}
      ref={trackRef}
      onDragOver={handleDragOver}
      onDrop={handleDropOnTrack}
    >
      <div className="w-48 p-2 border-r flex items-center shrink-0 bg-card">
        <GripVertical className="h-5 w-5 text-muted-foreground mr-1 cursor-grab" />
        {getIconForTrackType(track.type)}
        <span className="ml-2 text-sm font-medium truncate" title={track.name}>{track.name}</span>
      </div>
      <div className="flex-grow h-20 relative p-1 overflow-hidden"> {/* Main timeline strip for clips */}
        {track.clips.map((clip) => {
          const clipDurationOnTimeline = clip.sourceEnd - clip.sourceStart;
          
          const widthPercentage = projectDuration > 0 ? (clipDurationOnTimeline / projectDuration) * 100 : 0;
          const leftPercentage = projectDuration > 0 ? (clip.timelineStart / projectDuration) * 100 : 0;
          
          const clipTitle = clip.type === 'caption' 
            ? `${clip.name || 'Caption'}: "${clip.text?.substring(0,30)}..." (${clip.timelineStart.toFixed(1)}s)`
            : `${clip.name} (${clip.timelineStart.toFixed(1)}s - ${(clip.timelineStart + clipDurationOnTimeline).toFixed(1)}s)`;

          return (
            <div
              key={clip.id}
              draggable
              onDragStart={(e) => handleClipDragStart(e, clip.id)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-12 rounded-md shadow-sm flex items-center justify-start px-2 text-xs font-medium text-white overflow-hidden cursor-grab hover:ring-2 hover:ring-primary active:cursor-grabbing transition-all",
                clip.color,
                selectedClipId === clip.id && "ring-2 ring-offset-2 ring-accent"
              )}
              style={{
                left: `${leftPercentage}%`,
                width: `${Math.max(0.5, widthPercentage)}%`, 
              }}
              title={clipTitle}
              onClick={() => onClipSelect(clip.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClipSelect(clip.id); }}
              role="button"
              tabIndex={0}
              aria-pressed={selectedClipId === clip.id}
              aria-label={`Select clip ${clip.name}`}
            >
              <span className="truncate pointer-events-none"> {/* Prevent text selection during drag */}
                {clip.type === 'caption' ? (clip.text || 'Caption') : clip.name}
              </span>
            </div>
          );
        })}
        {/* Ruler Marks */}
        {Array.from({ length: Math.max(1, Math.floor(projectDuration / 10)) + 1 }).map((_, i) => {
          const timeMark = i * 10;
          if (timeMark > projectDuration && projectDuration > 0 && i > 0) return null;
          const positionPercentage = projectDuration > 0 ? (timeMark / projectDuration) * 100 : (i * 10);

          return (
            <div
              key={`ruler-${track.id}-${i}`}
              className="absolute top-0 bottom-0 border-l border-border/50"
              style={{ left: `${positionPercentage}%` }}
            >
              { i > 0 && <span className="absolute -top-0.5 left-1 text-xs text-muted-foreground">{timeMark}s</span> }
            </div>
          );
        })}
         <div className="absolute top-1/2 left-0 h-0.5 w-full bg-border -z-10" />
      </div>
    </div>
  );
};

interface TimelineProps {
  tracks: Track[];
  projectDuration: number;
  selectedClipId: string | null;
  onClipSelect: (clipId: string) => void;
  globalCurrentTime: number;
  onUpdateClipTimes: (clipId: string, newTimes: { timelineStart?: number; sourceStart?: number; sourceEnd?: number }) => void;
}
// Memoize tracks to avoid re-rendering all tracks if only one changes unrelated properties
const MemoizedTimelineTrackDisplay = React.memo(TimelineTrackDisplay);


export default function Timeline({ tracks, projectDuration, selectedClipId, onClipSelect, globalCurrentTime, onUpdateClipTimes }: TimelineProps) {
  const playheadPosition = projectDuration > 0 ? (globalCurrentTime / projectDuration) * 100 : 0;

  return (
    <Card className="flex-grow flex flex-col shadow-md overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-headline">Timeline ({projectDuration.toFixed(0)}s)</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden relative"> 
        <ScrollArea className="h-full w-full">
          <div className="min-w-[1200px] relative"> 
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${playheadPosition}%` }}
              aria-hidden="true"
            />
            {tracks.map(track => (
              <MemoizedTimelineTrackDisplay
                key={track.id}
                track={track}
                projectDuration={projectDuration}
                selectedClipId={selectedClipId}
                onClipSelect={onClipSelect}
                onUpdateClipTimes={onUpdateClipTimes}
                globalCurrentTime={globalCurrentTime}
              />
            ))}
            {tracks.length === 0 && (
              <div className="h-full flex items-center justify-center text-muted-foreground p-4">
                Your timeline is empty. Import media or add clips using the toolbox.
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper to find all tracks for onDrop
let tracks: Track[] = [];
if (typeof window !== 'undefined') {
  // This is a hack, ideally tracks would be passed down or context used.
  // For the purpose of this example, it demonstrates how to access tracks if they were available globally.
  // In a real app, `tracks` would be managed via state/props/context.
}
