
"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Music } from "lucide-react";
import type { MediaFile, Clip, Track } from "@/app/page";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  tracks: Track[];
  mediaLibrary: MediaFile[];
  globalCurrentTime: number;
  isGlobalPlaying: boolean;
  projectDuration: number;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
}

const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoPreview({
  tracks,
  mediaLibrary,
  globalCurrentTime,
  isGlobalPlaying,
  projectDuration,
  onTogglePlayPause,
  onSeek,
}: VideoPreviewProps) {
  const mediaElementRefs = useRef<Record<string, HTMLVideoElement | HTMLAudioElement>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [primaryVideoClipId, setPrimaryVideoClipId] = useState<string | null>(null);
  
  useEffect(() => {
    let newPrimaryClipId: string | null = null;
    
    const videoTracks = tracks.filter(t => t.type === 'video').reverse(); 

    for (const track of videoTracks) {
      for (const clip of track.clips) {
        const clipEffectiveDuration = clip.sourceEnd - clip.sourceStart;
        const clipIsActive = globalCurrentTime >= clip.timelineStart && globalCurrentTime < clip.timelineStart + clipEffectiveDuration;
        if (clipIsActive) {
          newPrimaryClipId = clip.id;
          break; 
        }
      }
      if (newPrimaryClipId) break;
    }
    setPrimaryVideoClipId(newPrimaryClipId);
  }, [globalCurrentTime, tracks]);

  useEffect(() => {
    Object.values(mediaElementRefs.current).forEach(mediaEl => {
      if (mediaEl) {
         mediaEl.muted = isMuted;
         const clipId = Object.keys(mediaElementRefs.current).find(id => mediaElementRefs.current[id] === mediaEl);
         if (mediaEl instanceof HTMLVideoElement && clipId !== primaryVideoClipId) {
            mediaEl.muted = true; 
         }
      }
    });
  }, [isMuted, primaryVideoClipId]);


  useEffect(() => {
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.type === 'caption') return; 

        const mediaEl = mediaElementRefs.current[clip.id];
        if (!mediaEl) return;

        const mediaFile = mediaLibrary.find(mf => mf.id === clip.mediaFileId);
        if (!mediaFile) return;
        
        if (mediaEl.currentSrc !== mediaFile.dataUri && mediaEl.src !== mediaFile.dataUri ) {
             mediaEl.src = mediaFile.dataUri;
             mediaEl.load(); 
        }
        
        const clipEffectiveDuration = clip.sourceEnd - clip.sourceStart;
        const clipIsActive = globalCurrentTime >= clip.timelineStart &&
                             globalCurrentTime < clip.timelineStart + clipEffectiveDuration;

        if (clipIsActive) {
          const timeWithinMediaSource = clip.sourceStart + (globalCurrentTime - clip.timelineStart);
          
          if (mediaEl.readyState >= 2 && Math.abs(mediaEl.currentTime - timeWithinMediaSource) > 0.25 && !mediaEl.seeking) {
            mediaEl.currentTime = timeWithinMediaSource;
          }

          if (isGlobalPlaying && mediaEl.paused && mediaEl.readyState >= 2) {
            mediaEl.play().catch(e => console.error(`Error playing clip ${clip.id}:`, e));
          } else if (!isGlobalPlaying && !mediaEl.paused) {
            mediaEl.pause();
          }
        } else {
          if (!mediaEl.paused) {
            mediaEl.pause();
          }
        }
      });
    });
  }, [globalCurrentTime, isGlobalPlaying, tracks, mediaLibrary, primaryVideoClipId]);


  const handleSkip = (amount: number) => {
    if (projectDuration <= 0) return;
    const newTime = Math.max(0, Math.min(projectDuration, globalCurrentTime + amount));
    onSeek(newTime);
  };

  const toggleMute = () => setIsMuted(prev => !prev);

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (projectDuration <= 0) return;
    const progressRail = event.currentTarget;
    const clickPosition = event.nativeEvent.offsetX;
    const railWidth = progressRail.offsetWidth;
    const seekTime = (clickPosition / railWidth) * projectDuration;
    onSeek(seekTime);
  };

  const toggleFullScreen = () => {
    if (primaryVideoClipId) {
      const primaryVideoEl = mediaElementRefs.current[primaryVideoClipId];
      if (primaryVideoEl instanceof HTMLVideoElement && primaryVideoEl.requestFullscreen) {
        primaryVideoEl.requestFullscreen().catch(err => console.error("Error entering fullscreen:", err));
      }
    }
  };
  
  const activeCaptions = useMemo(() => {
    return tracks
      .filter(track => track.type === 'caption')
      .flatMap(track => track.clips)
      .filter(clip => {
        const clipDuration = clip.sourceEnd - clip.sourceStart; // For captions, sourceStart is 0, sourceEnd is duration
        return globalCurrentTime >= clip.timelineStart && globalCurrentTime < clip.timelineStart + clipDuration;
      });
  }, [tracks, globalCurrentTime]);

  return (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-video bg-muted flex items-center justify-center relative group/videoplayer">
          {tracks.flatMap(track => 
            track.clips.map(clip => {
              if (clip.type === 'caption') return null; 

              const mediaFile = mediaLibrary.find(mf => mf.id === clip.mediaFileId);
              if (!mediaFile) return null;

              if (clip.type === 'video') {
                return (
                  <video
                    key={clip.id}
                    ref={el => { if (el) mediaElementRefs.current[clip.id] = el; else delete mediaElementRefs.current[clip.id]; }}
                    className={cn("w-full h-full object-contain absolute top-0 left-0", {
                      "visible": clip.id === primaryVideoClipId,
                      "invisible": clip.id !== primaryVideoClipId,
                    })}
                    playsInline
                    onClick={onTogglePlayPause}
                    onDoubleClick={toggleFullScreen}
                    muted={isMuted || clip.id !== primaryVideoClipId} 
                  />
                );
              } else if (clip.type === 'audio') {
                return (
                  <audio
                    key={clip.id}
                    ref={el => { if (el) mediaElementRefs.current[clip.id] = el; else delete mediaElementRefs.current[clip.id]; }}
                    playsInline
                    muted={isMuted}
                  />
                );
              }
              return null;
            })
          )}

          {!primaryVideoClipId && (
            <Image
              src="https://placehold.co/1280x720.png"
              alt="Media preview placeholder"
              fill
              className="object-cover"
              data-ai-hint="video screen abstract"
              priority
            />
          )}
          
          {primaryVideoClipId && !isGlobalPlaying && (
             <div 
                className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/videoplayer:opacity-100 transition-opacity duration-200 cursor-pointer"
                onClick={onTogglePlayPause}
                role="button"
                aria-label={isGlobalPlaying ? "Pause" : "Play"}
             >
                <Play className="h-16 w-16 text-white opacity-80 hover:opacity-100 transition-opacity" />
            </div>
           )}

           {primaryVideoClipId === null && tracks.some(t => t.type === 'audio' && t.clips.some(c => {
             const clipEffectiveDuration = c.sourceEnd - c.sourceStart;
             return globalCurrentTime >= c.timelineStart && globalCurrentTime < c.timelineStart + clipEffectiveDuration;
           })) && (
            <div className="flex flex-col items-center text-muted-foreground p-4 pointer-events-none">
                <Music className="w-24 h-24 mb-4" />
                <p className="text-lg font-semibold">Audio Playback</p>
            </div>
           )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full px-4 flex flex-col items-center space-y-1 pointer-events-none z-10">
            {activeCaptions.map(captionClip => (
              <div 
                key={captionClip.id} 
                className="bg-black/50 text-white text-center text-sm md:text-lg p-1 md:p-2 rounded max-w-3xl"
              >
                {captionClip.text}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-card border-t space-y-2">
          <div 
            className="w-full h-2 bg-muted rounded-full cursor-pointer group/progress"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Media progress"
            aria-valuenow={globalCurrentTime}
            aria-valuemin={0}
            aria-valuemax={projectDuration}
          >
            <div 
              className="h-full bg-primary rounded-full relative group-hover/progress:bg-accent transition-colors"
              style={{ width: projectDuration > 0 ? `${(globalCurrentTime / projectDuration) * 100}%` : '0%' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 border-2 border-background shadow transition-opacity group-hover/progress:bg-accent"></div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Rewind 5s" onClick={() => handleSkip(-5)} disabled={projectDuration <= 0}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isGlobalPlaying ? "Pause" : "Play"} onClick={onTogglePlayPause} disabled={projectDuration <= 0}>
                {isGlobalPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Fast Forward 5s" onClick={() => handleSkip(5)} disabled={projectDuration <= 0}>
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={isMuted ? "Unmute" : "Mute"} onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground tabular-nums">
              {formatTime(globalCurrentTime)} / {formatTime(projectDuration)}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Fullscreen" onClick={toggleFullScreen} disabled={!primaryVideoClipId}>
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

    
