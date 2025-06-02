
"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize } from "lucide-react";
import type { MediaFile } from "@/app/page"; // Using MediaFile for preview source

interface VideoPreviewProps {
  previewMedia: MediaFile | null; // Changed prop name and type
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoPreview({ previewMedia }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video && previewMedia) { // Use previewMedia
      video.src = previewMedia.dataUri;
      video.load(); 
      
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setCurrentTime(0); // Reset current time for new media
        setIsPlaying(false); // Ensure it doesn't auto-play unwantedly
      };
      const handleTimeUpdate = () => setCurrentTime(video.currentTime);
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(video.duration); // Or 0, depending on desired behavior
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handleEnded);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handleEnded);
      };
    } else if (!previewMedia && video) {
        video.removeAttribute('src');
        video.load();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }
  }, [previewMedia]);

  const togglePlayPause = () => {
    if (videoRef.current && previewMedia) { // Ensure previewMedia exists
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => console.error("Error playing video:", error));
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current && previewMedia) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSkip = (amount: number) => {
    if (videoRef.current && previewMedia) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
      handleSeek(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current && previewMedia) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && previewMedia && duration > 0) {
      const progressRail = event.currentTarget;
      const clickPosition = event.nativeEvent.offsetX;
      const railWidth = progressRail.offsetWidth;
      const seekTime = (clickPosition / railWidth) * duration;
      handleSeek(seekTime);
    }
  };

  const toggleFullScreen = () => {
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };
  
  return (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative group/videoplayer">
          {previewMedia && previewMedia.type.startsWith('video/') ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onClick={togglePlayPause} // Allow click on video to play/pause
              onDoubleClick={toggleFullScreen} // Double click for fullscreen
            />
          ) : (
            <Image
              src="https://placehold.co/1280x720.png"
              alt="Video preview placeholder"
              layout="fill"
              objectFit="cover"
              data-ai-hint="video screen"
              priority
            />
          )}
          {/* Overlay for play button when paused or no media */}
          {(!previewMedia || !isPlaying) && (
             <div 
                className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/videoplayer:opacity-100 transition-opacity duration-200 cursor-pointer"
                onClick={togglePlayPause}
                role="button"
                aria-label={isPlaying ? "Pause" : "Play"}
             >
                <Play className="h-16 w-16 text-white opacity-80 hover:opacity-100 transition-opacity" />
            </div>
           )}
        </div>

        {/* Custom Controls */}
        <div className="p-3 bg-card border-t space-y-2">
          {/* Progress Bar */}
          <div 
            className="w-full h-2 bg-muted rounded-full cursor-pointer group/progress"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Video progress"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={duration}
          >
            <div 
              className="h-full bg-primary rounded-full relative group-hover/progress:bg-accent transition-colors"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 border-2 border-background shadow transition-opacity group-hover/progress:bg-accent"></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Rewind 10s" onClick={() => handleSkip(-10)} disabled={!previewMedia}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlayPause} disabled={!previewMedia}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Fast Forward 10s" onClick={() => handleSkip(10)} disabled={!previewMedia}>
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} disabled={!previewMedia}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <div className="flex items-center gap-1">
              {/* Placeholder for future controls like speed, settings */}
              <Button variant="ghost" size="icon" aria-label="Fullscreen" onClick={toggleFullScreen} disabled={!previewMedia}>
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
