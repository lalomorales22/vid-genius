
"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

export default function VideoPreview() {
  return (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          <Image
            src="https://placehold.co/1280x720.png"
            alt="Video preview placeholder"
            layout="fill"
            objectFit="cover"
            data-ai-hint="video screen"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-16 w-16">
              <Play className="h-10 w-10" />
            </Button>
          </div>
        </div>
        <div className="p-2 bg-card border-t flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Rewind">
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Play/Pause">
              <Play className="h-5 w-5" />
            </Button>
             <Button variant="ghost" size="icon" aria-label="Fast Forward">
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">00:00 / 00:00</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Volume">
                <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
