
"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import type { MediaFile } from "@/app/page"; // Assuming MediaFile is exported from page.tsx

interface VideoPreviewProps {
  mediaFile: MediaFile | null;
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoPreview({ mediaFile }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && mediaFile) {
      video.src = mediaFile.dataUri;
      video.load(); // Important to load new source
      
      const handleLoadedMetadata = () => setDuration(video.duration);
      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handleEnded);

      // Reset state for new video
      setIsPlaying(false);
      setCurrentTime(0);
      // setDuration(0); // Will be set by loadedmetadata

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handleEnded);
      };
    } else if (!mediaFile && video) {
        // Clear video src if mediaFile is null
        video.removeAttribute('src');
        video.load();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }
  }, [mediaFile]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => console.error("Error playing video:", error));
      }
    }
  };

  const handleSkip = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };
  
  return (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          {mediaFile && mediaFile.type.startsWith('video/') ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onDoubleClick={togglePlayPause}
            />
          ) : (
            <Image
              src="https://placehold.co/1280x720.png"
              alt="Video preview placeholder"
              layout="fill"
              objectFit="cover"
              data-ai-hint="video screen"
            />
          )}
          {!mediaFile && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 group">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-16 w-16 opacity-70 group-hover:opacity-100" disabled>
                <Play className="h-10 w-10" />
                </Button>
            </div>
          )}
           {mediaFile && !isPlaying && (
             <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 group">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-16 w-16 opacity-70 group-hover:opacity-100" onClick={togglePlayPause}>
                    <Play className="h-10 w-10" />
                </Button>
            </div>
           )}
        </div>
        <div className="p-2 bg-card border-t flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Rewind 10s" onClick={() => handleSkip(-10)} disabled={!mediaFile}>
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlayPause} disabled={!mediaFile}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
             <Button variant="ghost" size="icon" aria-label="Fast Forward 10s" onClick={() => handleSkip(10)} disabled={!mediaFile}>
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} disabled={!mediaFile}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
