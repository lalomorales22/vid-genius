
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GripVertical, Film, Music2, Baseline } from "lucide-react";
import React from "react";

interface TimelineTrackProps {
  title: string;
  icon: React.ReactNode;
  clips: { id: string; start: number; end: number; color: string, name: string }[];
  bgColorClass?: string;
}

const TimelineTrack: React.FC<TimelineTrackProps> = ({ title, icon, clips, bgColorClass = "bg-muted/30" }) => {
  const totalDuration = 100; // Example: 100 units for total timeline width percentage

  return (
    <div className={`flex items-stretch border-b last:border-b-0 ${bgColorClass}`}>
      <div className="w-48 p-2 border-r flex items-center shrink-0 bg-card">
        <GripVertical className="h-5 w-5 text-muted-foreground mr-1 cursor-grab" />
        {icon}
        <span className="ml-2 text-sm font-medium truncate">{title}</span>
      </div>
      <div className="flex-grow h-20 relative p-1 overflow-hidden">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className={`absolute top-1/2 -translate-y-1/2 h-12 rounded-md shadow-sm flex items-center justify-center px-2 text-xs font-medium text-white overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all ${clip.color}`}
            style={{
              left: `${(clip.start / totalDuration) * 100}%`,
              width: `${((clip.end - clip.start) / totalDuration) * 100}%`,
            }}
            title={clip.name}
          >
            <span className="truncate">{clip.name}</span>
          </div>
        ))}
        {/* Timeline ruler/grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-border/50"
            style={{ left: `${i * 10}%` }}
          >
            { i > 0 && <span className="absolute -top-0.5 left-1 text-xs text-muted-foreground">{i*10}s</span> }
          </div>
        ))}
         <div className="absolute top-1/2 left-0 h-0.5 w-full bg-border -z-10" />
      </div>
    </div>
  );
};

export default function Timeline() {
  const videoClips: { id: string; start: number; end: number; color: string; name: string }[] = [];
  const audioClips: { id: string; start: number; end: number; color: string; name: string }[] = [];
  const captionClips: { id: string; start: number; end: number; color: string; name: string }[] = [];

  return (
    <Card className="flex-grow flex flex-col shadow-md overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-headline">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="min-w-[1200px]"> {/* Ensure horizontal scroll for timeline content */}
            <TimelineTrack title="Video Track 1" icon={<Film className="h-5 w-5 text-blue-500" />} clips={videoClips} bgColorClass="bg-blue-500/10" />
            <TimelineTrack title="Audio Track 1" icon={<Music2 className="h-5 w-5 text-green-500" />} clips={audioClips} bgColorClass="bg-green-500/10" />
            <TimelineTrack title="Captions" icon={<Baseline className="h-5 w-5 text-orange-500" />} clips={captionClips} bgColorClass="bg-orange-500/10" />
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
