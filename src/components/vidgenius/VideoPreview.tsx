
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

  useEffect(() => {
    if (previewableItem) {
      const newMediaType = previewableItem.mediaFile.type.startsWith('video/') ? 'video' : 'audio';
      setMediaType(newMediaType);
    } else {
      setMediaType(null);
      // Reset states when no item is selected
      setIsPlaying(false);
      setCurrentTime(0);
      setClipDuration(0);
      if (mediaRef.current) {
        mediaRef.current.removeAttribute('src');
        mediaRef.current.load(); // Important to reset the media element
      }
    }
  }, [previewableItem]);

  useEffect(() => {
    const mediaElement = mediaRef.current;

    if (!previewableItem || !mediaElement) {
      return;
    }

    const { mediaFile, clip } = previewableItem;

    const handleLoadedMetadata = () => {
      if (mediaRef.current) { // Check ref again inside async handler
        mediaRef.current.currentTime = clip.sourceStart;
        setClipDuration(clip.sourceEnd - clip.sourceStart);
        setCurrentTime(0); // Reset current time relative to clip
        setIsPlaying(false); // Ensure it starts paused
         if (mediaRef.current.muted !== isMuted) { // Sync mute state
          mediaRef.current.muted = isMuted;
        }
      }
    };

    const handleError = () => {
      console.error("Error loading media for preview:", mediaFile.name);
      setClipDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
    };

    const handleTimeUpdate = () => {
      if (!mediaRef.current || !previewableItem) return; // Guard with previewableItem
      const currentMediaTime = mediaRef.current.currentTime;
      const { clip: currentClip } = previewableItem; // Use currentClip from item

      if (currentMediaTime >= currentClip.sourceEnd) {
        mediaRef.current.pause();
        setIsPlaying(false);
        setCurrentTime(currentClip.sourceEnd - currentClip.sourceStart);
      } else if (currentMediaTime < currentClip.sourceStart && !mediaRef.current.seeking) {
        // This case should ideally be prevented by seek logic, but as a fallback:
        mediaRef.current.currentTime = currentClip.sourceStart;
        setCurrentTime(0);
      } else {
        setCurrentTime(currentMediaTime - currentClip.sourceStart);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    // This handles when the media natively ends, ensure it respects clip boundaries
    const handleEnded = () => {
      setIsPlaying(false);
      if (mediaRef.current && previewableItem) {
        // Set current time to the end of the clip segment
        setCurrentTime(previewableItem.clip.sourceEnd - previewableItem.clip.sourceStart);
        // Optionally, seek media element to clip.sourceEnd if needed
        // mediaRef.current.currentTime = previewableItem.clip.sourceEnd;
      }
    };
    
    // Detach previous listeners before attaching new ones if mediaElement itself is persistent
    // However, since <video>/<audio> tag might change, direct add/remove is safer per item change.
    
    mediaElement.src = mediaFile.dataUri;
    
    mediaElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    mediaElement.addEventListener('error', handleError);
    mediaElement.addEventListener('timeupdate', handleTimeUpdate);
    mediaElement.addEventListener('play', handlePlay);
    mediaElement.addEventListener('pause', handlePause);
    mediaElement.addEventListener('ended', handleEnded);

    mediaElement.load(); // Start loading the new source

    return () => {
      mediaElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      mediaElement.removeEventListener('error', handleError);
      mediaElement.removeEventListener('timeupdate', handleTimeUpdate);
      mediaElement.removeEventListener('play', handlePlay);
      mediaElement.removeEventListener('pause', handlePause);
      mediaElement.removeEventListener('ended', handleEnded);
      // No need to remove src here as the new item will set its own or it will be cleared if item is null
    };
  }, [previewableItem, mediaType, isMuted]); // Add mediaType and isMuted to ensure effect runs if those cause changes affecting media

  const togglePlayPause = () => {
    const media = mediaRef.current;
    if (!media || !previewableItem) return;
    const { clip } = previewableItem;

    if (isPlaying) {
      media.pause();
    } else {
      // Ensure media.currentTime is within the clip's bounds before playing
      if (media.currentTime < clip.sourceStart || media.currentTime >= clip.sourceEnd) {
         media.currentTime = clip.sourceStart;
         setCurrentTime(0); // Reflect this change in UI
      }
      media.play().catch(error => {
        console.error("Error playing media:", error);
        setIsPlaying(false); // Ensure state consistency on error
      });
    }
  };

  const handleSeek = (timeWithinClip: number) => {
    const media = mediaRef.current;
    if (!media || !previewableItem) return;
    const { clip } = previewableItem;
    // Ensure seek time is within 0 and clip duration
    const newTimeInClip = Math.max(0, Math.min(timeWithinClip, clip.sourceEnd - clip.sourceStart));
    const newMediaTime = clip.sourceStart + newTimeInClip;
    
    media.currentTime = newMediaTime;
    setCurrentTime(newTimeInClip);
  };

  const handleSkip = (amount: number) => {
    if (!previewableItem || clipDuration <= 0) return;
    const newClipTime = Math.max(0, Math.min(clipDuration, currentTime + amount));
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
      media.requestFullscreen().catch(err => console.error("Error entering fullscreen:", err));
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
              playsInline
              muted={isMuted} // Controlled mute
            />
          )}
          {mediaType === 'audio' && previewableItem && (
            <>
              <audio 
                ref={mediaRef as React.Ref<HTMLAudioElement>} 
                playsInline 
                muted={isMuted} // Controlled mute
              />
              <div className="flex flex-col items-center text-muted-foreground p-4 pointer-events-none">
                <Music className="w-24 h-24 mb-4" />
                <p className="text-lg font-semibold">{previewableItem.mediaFile.name}</p>
                <p className="text-sm">Audio track</p>
              </div>
            </>
          )}
          {(!previewableItem) && ( // Simpler condition: if no item, show placeholder
            <Image
              src="https://placehold.co/1280x720.png"
              alt="Media preview placeholder"
              layout="fill"
              objectFit="cover"
              data-ai-hint="video screen abstract"
              priority
            />
          )}
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
              <Button variant="ghost" size="icon" aria-label="Rewind 5s" onClick={() => handleSkip(-5)} disabled={!previewableItem || clipDuration <= 0}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isPlaying ? "Pause" : "Play"} onClick={togglePlayPause} disabled={!previewableItem || clipDuration <= 0}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Fast Forward 5s" onClick={() => handleSkip(5)} disabled={!previewableItem || clipDuration <= 0}>
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
