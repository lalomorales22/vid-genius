
"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Music } from "lucide-react";
import type { MediaFile, Clip } from "@/app/page";

export interface PreviewableItem {
  mediaFile: MediaFile;
  clip: Clip;
}

interface VideoPreviewProps {
  previewableItem: PreviewableItem | null;
}

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoPreview({ previewableItem }: VideoPreviewProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Relative to clip start
  const [clipDuration, setClipDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | null>(null);

  const _loadMedia = useCallback(() => {
    const mediaElement = mediaRef.current;
    if (!mediaElement || !previewableItem) {
        setIsPlaying(false);
        setCurrentTime(0);
        setClipDuration(0);
        setMediaType(null);
        if (mediaElement) {
            mediaElement.removeAttribute('src');
            mediaElement.load();
        }
        return;
    }

    const { mediaFile, clip } = previewableItem;
    
    setMediaType(mediaFile.type.startsWith('video/') ? 'video' : 'audio');
    mediaElement.src = mediaFile.dataUri;
    mediaElement.load();

    const handleLoadedMetadata = () => {
      mediaElement.currentTime = clip.sourceStart;
      setClipDuration(clip.sourceEnd - clip.sourceStart);
      setCurrentTime(0);
      setIsPlaying(false); 
    };

    mediaElement.onloadedmetadata = handleLoadedMetadata;
    mediaElement.onerror = () => {
        console.error("Error loading media for preview:", mediaFile.name);
        setClipDuration(0);
        setCurrentTime(0);
        setIsPlaying(false);
    }

  }, [previewableItem]);


  useEffect(() => {
    _loadMedia(); // Initial load and when previewableItem changes

    const mediaElement = mediaRef.current;
    if (!mediaElement || !previewableItem) return;

    const { clip } = previewableItem;

    const handleTimeUpdate = () => {
      if (mediaElement.currentTime >= clip.sourceEnd) {
        mediaElement.pause();
        setIsPlaying(false);
        setCurrentTime(clip.sourceEnd - clip.sourceStart); // Show full clip duration
      } else if (mediaElement.currentTime < clip.sourceStart && !mediaElement.seeking) {
        // If player somehow goes before sourceStart (e.g. after seeking before and playing)
        // Forcibly set it to sourceStart, though this case should be rare with proper seek handling
        mediaElement.currentTime = clip.sourceStart;
        setCurrentTime(0);
      } else {
        setCurrentTime(mediaElement.currentTime - clip.sourceStart);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => { // This might fire if native duration is reached before clip.sourceEnd
      setIsPlaying(false);
      setCurrentTime(Math.min(mediaElement.duration, clip.sourceEnd) - clip.sourceStart);
    };
    
    mediaElement.addEventListener("timeupdate", handleTimeUpdate);
    mediaElement.addEventListener("play", handlePlay);
    mediaElement.addEventListener("pause", handlePause);
    mediaElement.addEventListener("ended", handleEnded);

    return () => {
      mediaElement.removeEventListener("timeupdate", handleTimeUpdate);
      mediaElement.removeEventListener("play", handlePlay);
      mediaElement.removeEventListener("pause", handlePause);
      mediaElement.removeEventListener("ended", handleEnded);
    };
  }, [previewableItem, _loadMedia]);


  const togglePlayPause = () => {
    const media = mediaRef.current;
    if (!media || !previewableItem) return;
    const { clip } = previewableItem;

    if (isPlaying) {
      media.pause();
    } else {
      if (media.currentTime < clip.sourceStart || media.currentTime >= clip.sourceEnd) {
         media.currentTime = clip.sourceStart; // Reset to clip start if outside range
      }
      media.play().catch(error => console.error("Error playing media:", error));
    }
  };

  const handleSeek = (timeWithinClip: number) => {
    const media = mediaRef.current;
    if (!media || !previewableItem) return;
    const { clip } = previewableItem;
    const newMediaTime = clip.sourceStart + timeWithinClip;
    
    if (newMediaTime >= clip.sourceStart && newMediaTime <= clip.sourceEnd) {
      media.currentTime = newMediaTime;
      setCurrentTime(timeWithinClip); // Update UI immediately
    }
  };

  const handleSkip = (amount: number) => {
    if (!mediaRef.current || !previewableItem) return;
    const { clip } = previewableItem;
    const currentClipTime = mediaRef.current.currentTime - clip.sourceStart;
    const newClipTime = Math.max(0, Math.min(clipDuration, currentClipTime + amount));
    handleSeek(newClipTime);
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (media) {
      media.muted = !media.muted;
      setIsMuted(media.muted);
    }
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!previewableItem || clipDuration <= 0) return;
    const progressRail = event.currentTarget;
    const clickPosition = event.nativeEvent.offsetX;
    const railWidth = progressRail.offsetWidth;
    const seekTimeInClip = (clickPosition / railWidth) * clipDuration;
    handleSeek(seekTimeInClip);
  };

  const toggleFullScreen = () => {
    const media = mediaRef.current;
    if (media instanceof HTMLVideoElement && media.requestFullscreen) {
      media.requestFullscreen();
    }
  };
  
  return (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative group/videoplayer">
          {mediaType === 'video' && previewableItem && (
            <video
              ref={mediaRef as React.Ref<HTMLVideoElement>}
              className="w-full h-full object-contain"
              onClick={togglePlayPause}
              onDoubleClick={toggleFullScreen}
              playsInline // Good for mobile
            />
          )}
          {mediaType === 'audio' && previewableItem && (
            <>
              <audio ref={mediaRef as React.Ref<HTMLAudioElement>} playsInline />
              <div className="flex flex-col items-center text-muted-foreground p-4">
                <Music className="w-24 h-24 mb-4" />
                <p className="text-lg font-semibold">{previewableItem.mediaFile.name}</p>
                <p className="text-sm">Audio track</p>
              </div>
            </>
          )}
          {(!previewableItem || mediaType === null) && (
            <Image
              src="https://placehold.co/1280x720.png"
              alt="Media preview placeholder"
              layout="fill"
              objectFit="cover"
              data-ai-hint="video screen abstract"
              priority
            />
          )}
          {/* Overlay for play button */}
          {previewableItem && !isPlaying && (
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

        <div className="p-3 bg-card border-t space-y-2">
          <div 
            className="w-full h-2 bg-muted rounded-full cursor-pointer group/progress"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Media progress"
            aria-valuenow={currentTime}
            aria-valuemin={0}
            aria-valuemax={clipDuration}
          >
            <div 
              className="h-full bg-primary rounded-full relative group-hover/progress:bg-accent transition-colors"
              style={{ width: clipDuration > 0 ? `${(currentTime / clipDuration) * 100}%` : '0%' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 border-2 border-background shadow transition-opacity group-hover/progress:bg-accent"></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Rewind 5s" onClick={() => handleSkip(-5)} disabled={!previewableItem}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlayPause} disabled={!previewableItem}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Fast Forward 5s" onClick={() => handleSkip(5)} disabled={!previewableItem}>
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute} disabled={!previewableItem}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(clipDuration)}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Fullscreen" onClick={toggleFullScreen} disabled={mediaType !== 'video' || !previewableItem}>
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    
