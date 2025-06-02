
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GripVertical, Film, Music2, Baseline } from "lucide-react";
import React from "react";
import type { MediaFile } from "@/app/page"; // Assuming MediaFile is exported from page.tsx

interface Clip {
  id: string;
  name: string;
  start: number; // in seconds
  end: number;   // in seconds
  color: string;
  type: 'video' | 'audio' | 'caption';
  dataUri?: string; // Optional: might be useful later
}

interface TimelineTrackProps {
  title: string;
  icon: React.ReactNode;
  clips: Clip[];
  bgColorClass?: string;
  totalTimelineDurationSeconds: number; // Total duration of the timeline for scaling
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({ title, icon, clips, bgColorClass = "bg-muted/30", totalTimelineDurationSeconds }) => {
  return (
    <div className={`flex items-stretch border-b last:border-b-0 ${bgColorClass}`}>
      <div className="w-48 p-2 border-r flex items-center shrink-0 bg-card">
        <GripVertical className="h-5 w-5 text-muted-foreground mr-1 cursor-grab" />
        {icon}
        <span className="ml-2 text-sm font-medium truncate">{title}</span>
      </div>
      <div className="flex-grow h-20 relative p-1 overflow-hidden">
        {clips.map((clip) => {
          const clipDuration = clip.end - clip.start;
          const widthPercentage = totalTimelineDurationSeconds > 0 ? (clipDuration / totalTimelineDurationSeconds) * 100 : 0;
          const leftPercentage = totalTimelineDurationSeconds > 0 ? (clip.start / totalTimelineDurationSeconds) * 100 : 0;
          
          return (
            <div
              key={clip.id}
              className={`absolute top-1/2 -translate-y-1/2 h-12 rounded-md shadow-sm flex items-center justify-center px-2 text-xs font-medium text-white overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all ${clip.color}`}
              style={{
                left: `${leftPercentage}%`,
                width: `${Math.max(0.5, widthPercentage)}%`, // Ensure a minimum visible width
              }}
              title={`${clip.name} (${clip.start.toFixed(1)}s - ${clip.end.toFixed(1)}s)`}
            >
              <span className="truncate">{clip.name}</span>
            </div>
          );
        })}
        {/* Timeline ruler/grid - scaled by totalTimelineDurationSeconds */}
        {Array.from({ length: Math.max(1, Math.floor(totalTimelineDurationSeconds / 10)) + 1 }).map((_, i) => {
          const timeMark = i * 10;
          if (timeMark > totalTimelineDurationSeconds && totalTimelineDurationSeconds > 0 && i > 0) return null; // Don't draw marks beyond total duration unless it's zero
          const positionPercentage = totalTimelineDurationSeconds > 0 ? (timeMark / totalTimelineDurationSeconds) * 100 : (i * 10);

          return (
            <div
              key={`ruler-${i}`}
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
  videoMedia: MediaFile | null;
  audioMediaList: MediaFile[];
}

export default function Timeline({ videoMedia, audioMediaList }: TimelineProps) {
  // Determine overall timeline duration. For now, let's use the video duration or a default.
  // This could be more sophisticated, e.g., longest of all media or a project setting.
  const baseTimelineDuration = 60; // Default 60 seconds
  const totalTimelineDurationSeconds = videoMedia?.duration 
    ? Math.max(baseTimelineDuration, videoMedia.duration, ...audioMediaList.map(a => a.duration))
    : Math.max(baseTimelineDuration, ...audioMediaList.map(a => a.duration));


  const videoClips: Clip[] = videoMedia
    ? [{
        id: videoMedia.id,
        name: videoMedia.name,
        start: 0, // Assuming video clips start at 0 for now
        end: videoMedia.duration,
        color: "bg-blue-500",
        type: 'video',
        dataUri: videoMedia.dataUri,
      }]
    : [];

  const audioClips: Clip[] = audioMediaList.map((audio, index) => ({
    id: audio.id,
    name: audio.name,
    start: 0, // Assuming audio clips start at 0 for now, could be staggered later
    end: audio.duration,
    color: "bg-green-500",
    type: 'audio',
    dataUri: audio.dataUri,
  }));

  // Placeholder for captions
  const captionClips: Clip[] = [];

  return (
    <Card className="flex-grow flex flex-col shadow-md overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-headline">Timeline ({totalTimelineDurationSeconds.toFixed(0)}s)</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          {/* Ensure horizontal scroll for timeline content based on a min-width or dynamic width */}
          <div className="min-w-[1200px]"> 
            <TimelineTrack title="Video Track 1" icon={<Film className="h-5 w-5 text-blue-500" />} clips={videoClips} bgColorClass="bg-blue-500/10" totalTimelineDurationSeconds={totalTimelineDurationSeconds} />
            <TimelineTrack title="Audio Track 1" icon={<Music2 className="h-5 w-5 text-green-500" />} clips={audioClips} bgColorClass="bg-green-500/10" totalTimelineDurationSeconds={totalTimelineDurationSeconds} />
            <TimelineTrack title="Captions" icon={<Baseline className="h-5 w-5 text-orange-500" />} clips={captionClips} bgColorClass="bg-orange-500/10" totalTimelineDurationSeconds={totalTimelineDurationSeconds} />
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
