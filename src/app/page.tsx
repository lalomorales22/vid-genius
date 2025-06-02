
"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import AppHeader from "@/components/vidgenius/AppHeader";
import MediaImportArea from "@/components/vidgenius/MediaImportArea";
import Toolbox from "@/components/vidgenius/Toolbox";
import VideoPreview from "@/components/vidgenius/VideoPreview";
import Timeline from "@/components/vidgenius/Timeline";
import AiEditorSidebar from "@/components/vidgenius/AiEditorSidebar";
import TimelineControls from "@/components/vidgenius/TimelineControls";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { generateCaptions, GenerateCaptionsInput, GenerateCaptionsOutput } from "@/ai/flows/generate-captions";
import { editVideoWithAI, EditVideoWithAIInput, EditVideoWithAIOutput } from "@/ai/flows/edit-video-with-ai";


export interface MediaFile {
  id: string;
  name: string;
  type: string; // MIME type
  dataUri: string;
  duration: number; // in seconds
}

export interface Clip {
  id: string;
  mediaFileId: string; // For video/audio, points to MediaFile
  trackId: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  sourceStart: number; // in seconds, within the original media file (if applicable)
  sourceEnd: number;   // in seconds, within the original media file (if applicable)
  timelineStart: number; // in seconds, on the project timeline
  color: string;
  text?: string; // For captions
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  clips: Clip[];
}

const DEFAULT_PROJECT_DURATION = 60; // seconds

export default function VidGeniusPage() {
  const [mediaLibrary, setMediaLibrary] = useState<MediaFile[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const { toast } = useToast();

  const [globalCurrentTime, setGlobalCurrentTime] = useState<number>(0);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState<boolean>(false);
  const requestAnimationFrameIdRef = useRef<number | null>(null);
  const animationLoopStartTimeRef = useRef<number>(0);

  const projectDuration = useMemo(() => {
    if (tracks.length === 0) {
      return DEFAULT_PROJECT_DURATION;
    }
    let maxEndTime = 0;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        let clipDuration = 0;
        if (clip.type === 'caption') {
          // Estimate caption duration, e.g., 5 seconds or based on text length
          clipDuration = clip.text ? Math.max(3, clip.text.length / 15) : 5;
        } else {
          clipDuration = clip.sourceEnd - clip.sourceStart;
        }
        const clipEndTime = clip.timelineStart + clipDuration;
        if (clipEndTime > maxEndTime) {
          maxEndTime = clipEndTime;
        }
      });
    });
    return Math.max(DEFAULT_PROJECT_DURATION, maxEndTime);
  }, [tracks]);

  const animationFrameLoop = useCallback(() => {
    const elapsedSinceLoopStart = (Date.now() - animationLoopStartTimeRef.current) / 1000;
    const newCurrentTime = globalCurrentTime + elapsedSinceLoopStart; // Accumulate time based on when loop started

    setGlobalCurrentTime(prevTime => {
      const currentDelta = (Date.now() - animationLoopStartTimeRef.current) / 1000;
      animationLoopStartTimeRef.current = Date.now(); // Reset start time for next frame
      const nextTime = prevTime + currentDelta;
      
      if (nextTime >= projectDuration) {
        setIsGlobalPlaying(false);
        if (requestAnimationFrameIdRef.current) {
          cancelAnimationFrame(requestAnimationFrameIdRef.current);
          requestAnimationFrameIdRef.current = null;
        }
        return projectDuration;
      }
      return nextTime;
    });

    if (globalCurrentTime < projectDuration && isGlobalPlaying) {
       requestAnimationFrameIdRef.current = requestAnimationFrame(animationFrameLoop);
    } else if (globalCurrentTime >= projectDuration && isGlobalPlaying) {
        setIsGlobalPlaying(false); // Stop if it reaches the end
        setGlobalCurrentTime(projectDuration);
         if (requestAnimationFrameIdRef.current) {
          cancelAnimationFrame(requestAnimationFrameIdRef.current);
          requestAnimationFrameIdRef.current = null;
        }
    }
  }, [projectDuration, isGlobalPlaying, globalCurrentTime]);


  const handleToggleGlobalPlayPause = useCallback(() => {
    setIsGlobalPlaying(prevIsPlaying => {
      const nowPlaying = !prevIsPlaying;
      if (nowPlaying) {
        let effectiveCurrentTime = globalCurrentTime;
        if (globalCurrentTime >= projectDuration && projectDuration > 0) { // Ensure projectDuration is positive
          effectiveCurrentTime = 0;
          setGlobalCurrentTime(0);
        }
        animationLoopStartTimeRef.current = Date.now(); // Reset start time when play is initiated
        
        if (requestAnimationFrameIdRef.current) {
          cancelAnimationFrame(requestAnimationFrameIdRef.current);
        }
        requestAnimationFrameIdRef.current = requestAnimationFrame(animationFrameLoop);
      } else {
        if (requestAnimationFrameIdRef.current) {
          cancelAnimationFrame(requestAnimationFrameIdRef.current);
          requestAnimationFrameIdRef.current = null;
        }
      }
      return nowPlaying;
    });
  }, [globalCurrentTime, projectDuration, animationFrameLoop]);


  const handleGlobalSeek = useCallback((newTime: number) => {
    const newCappedTime = Math.max(0, Math.min(newTime, projectDuration));
    setGlobalCurrentTime(newCappedTime);
    if (isGlobalPlaying) {
      // Adjust the loop start time to maintain smooth playback from the new seek position
      animationLoopStartTimeRef.current = Date.now(); 
      if (!requestAnimationFrameIdRef.current) { // If not already playing, start the loop
         requestAnimationFrameIdRef.current = requestAnimationFrame(animationFrameLoop);
      }
    }
  }, [isGlobalPlaying, projectDuration, animationFrameLoop]);


  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getMediaDuration = (file: File, objectUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const mediaElement = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
      mediaElement.preload = 'metadata';
      mediaElement.onloadedmetadata = () => {
        resolve(mediaElement.duration);
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
      };
      mediaElement.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        console.error("Error loading media metadata for duration check");
      }
      mediaElement.src = objectUrl;
    });
  };

  const addMediaFileToLibraryAndTimeline = useCallback(async (file: File) => {
    try {
      const dataUri = await readFileAsDataURL(file);
      const objectUrlForDuration = URL.createObjectURL(file);
      const duration = await getMediaDuration(file, objectUrlForDuration);

      if (duration === 0 && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
        setTimeout(() => {
          toast({
            title: "Media Processing Error",
            description: `Could not determine duration for ${file.name}. It might be corrupted or an unsupported format.`,
            variant: "destructive",
          });
        }, 0);
        return;
      }

      const newMediaFile: MediaFile = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        type: file.type,
        dataUri,
        duration,
      };

      setMediaLibrary((prevLibrary) => [...prevLibrary, newMediaFile]);

      const trackType = file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'audio' : 'caption');
      const existingTracksOfType = tracks.filter(t => t.type === trackType);
      const newTrackName = `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track ${existingTracksOfType.length + 1}`;
      const newTrackId = `track-${trackType}-${Date.now()}`;

      const newClip: Clip = {
        id: `clip-${newMediaFile.id}-${Date.now()}`,
        mediaFileId: newMediaFile.id,
        trackId: newTrackId,
        name: newMediaFile.name,
        type: trackType,
        sourceStart: 0,
        sourceEnd: newMediaFile.duration,
        timelineStart: 0, // Default to start of timeline
        color: trackType === 'video' ? 'bg-blue-500' : (trackType === 'audio' ? 'bg-green-500' : 'bg-orange-500'),
      };

      const newTrack: Track = {
        id: newTrackId,
        name: newTrackName,
        type: trackType,
        clips: [newClip],
      };

      setTracks((prevTracks) => [...prevTracks, newTrack]);
      setTimeout(() => {
        toast({
          title: "Media Added",
          description: `${newMediaFile.name} added to timeline.`,
        });
      }, 0);

    } catch (error) {
      console.error("Error processing file:", error);
      setTimeout(() => {
        toast({
          title: "File Upload Error",
          description: "There was an issue processing your file.",
          variant: "destructive",
        });
      }, 0);
    }
  }, [tracks, toast]);

  const handleGenerateSubtitles = useCallback(async (language: string = "en") => {
    if (!selectedClipId) {
      setTimeout(() => {
        toast({ title: "No clip selected", description: "Please select a video clip to generate subtitles.", variant: "default" });
      }, 0);
      return null;
    }

    const selectedClip = tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
    if (!selectedClip || selectedClip.type !== 'video') {
      setTimeout(() => {
        toast({ title: "Invalid clip", description: "Please select a video clip.", variant: "default" });
      }, 0);
      return null;
    }

    const mediaFile = mediaLibrary.find(mf => mf.id === selectedClip.mediaFileId);
    if (!mediaFile) {
       setTimeout(() => {
        toast({ title: "Media not found", description: "Source media for the clip is missing.", variant: "destructive" });
      }, 0);
      return null;
    }
    
    try {
      const input: GenerateCaptionsInput = { videoDataUri: mediaFile.dataUri, language };
      const result = await generateCaptions(input);

      const newCaptionClip: Clip = {
        id: `caption-${Date.now()}`,
        mediaFileId: '', // No direct media file for captions, text is embedded
        trackId: '', // Will be assigned when adding to a new track
        name: `Subtitles for ${selectedClip.name}`,
        type: 'caption',
        sourceStart: 0, // Not applicable for text
        sourceEnd: 0,   // Not applicable for text
        timelineStart: selectedClip.timelineStart, // Align with video clip start
        color: 'bg-yellow-500',
        text: result.captions,
      };

      // Add to a new caption track or an existing one
      let captionTrack = tracks.find(t => t.type === 'caption' && t.name.includes("Caption Track")); // Simple find logic
      if (captionTrack) {
        newCaptionClip.trackId = captionTrack.id;
        setTracks(prevTracks => prevTracks.map(t => 
          t.id === captionTrack!.id ? { ...t, clips: [...t.clips, newCaptionClip] } : t
        ));
      } else {
        const newTrackId = `track-caption-${Date.now()}`;
        newCaptionClip.trackId = newTrackId;
        const newTrack: Track = {
          id: newTrackId,
          name: `Caption Track 1`,
          type: 'caption',
          clips: [newCaptionClip],
        };
        setTracks(prevTracks => [...prevTracks, newTrack]);
      }
       setTimeout(() => {
        toast({ title: "Subtitles Generated", description: `Captions added for ${selectedClip.name}.` });
      }, 0);
      return result;
    } catch (error) {
      console.error("Error generating subtitles:", error);
       setTimeout(() => {
        toast({ title: "Subtitle Generation Failed", description: "Could not generate subtitles.", variant: "destructive" });
      }, 0);
      return null;
    }
  }, [selectedClipId, tracks, mediaLibrary, toast]);


  const handleDeleteSelectedClip = useCallback(() => {
    if (!selectedClipId) {
      setTimeout(() => {
        toast({ title: "No clip selected", description: "Please select a clip to delete.", variant: "default" });
      }, 0);
      return;
    }

    setTracks(prevTracks => {
      const newTracks = prevTracks.map(track => {
        const filteredClips = track.clips.filter(clip => clip.id !== selectedClipId);
        if (filteredClips.length === 0 && track.clips.some(c => c.id === selectedClipId)) {
          // If all clips from a track are removed, remove the track itself
          return null;
        }
        return { ...track, clips: filteredClips };
      }).filter(track => track !== null) as Track[]; // Type assertion to filter out nulls

      // Re-number tracks if some are deleted
      const trackCounts: { [key: string]: number } = { video: 0, audio: 0, caption: 0 };
      return newTracks.map(track => {
        trackCounts[track.type]++;
        return {
          ...track,
          name: `${track.type.charAt(0).toUpperCase() + track.type.slice(1)} Track ${trackCounts[track.type]}`
        };
      });
    });

    setSelectedClipId(null);
    setTimeout(() => {
      toast({ title: "Clip Deleted", description: "The selected clip has been removed." });
    }, 0);
  }, [selectedClipId, toast]);

  const handleSelectClip = useCallback((clipId: string) => {
    setSelectedClipId(prevId => (prevId === clipId ? null : clipId));
  }, []);

  const selectedClipForControls = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find(c => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, tracks]);

  const handleUpdateClipTimes = useCallback((clipId: string, newTimes: { sourceStart?: number; sourceEnd?: number }) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const mediaFile = mediaLibrary.find(mf => mf.id === clip.mediaFileId);
            // For caption clips, mediaFile might not exist or duration isn't relevant in the same way
            if (!mediaFile && clip.type !== 'caption') return clip;


            let updatedStart = newTimes.sourceStart !== undefined ? newTimes.sourceStart : clip.sourceStart;
            let updatedEnd = newTimes.sourceEnd !== undefined ? newTimes.sourceEnd : clip.sourceEnd;

            // If it's a media clip, validate against media file duration
            if (mediaFile && clip.type !== 'caption') {
              updatedStart = Math.max(0, updatedStart);
              updatedEnd = Math.min(mediaFile.duration, updatedEnd);

              if (updatedStart >= updatedEnd) {
                // Attempt to fix invalid trim, ensuring minimum 0.1s duration
                if (newTimes.sourceStart !== undefined && newTimes.sourceEnd === undefined) { // Only start changed
                  updatedStart = Math.min(updatedStart, clip.sourceEnd - 0.1);
                } else if (newTimes.sourceEnd !== undefined && newTimes.sourceStart === undefined) { // Only end changed
                  updatedEnd = Math.max(updatedEnd, clip.sourceStart + 0.1);
                } else { // Both might have changed or are being set
                   updatedStart = Math.min(updatedStart, mediaFile.duration - 0.1);
                   updatedEnd = updatedStart + 0.1; // Ensure end is after start
                }
                // Final check to ensure within bounds
                updatedEnd = Math.min(mediaFile.duration, updatedEnd);
                updatedStart = Math.max(0, updatedStart);

                 if (updatedStart >= updatedEnd) { // If still invalid, show toast and revert
                   setTimeout(() => {
                     toast({ title: "Invalid trim", description: "Clip start time must be before end time and within media bounds.", variant: "destructive"});
                   }, 0);
                   return clip; // Return original clip
                 }
              }
            }
            // For captions, start/end times are more about placement, less about source media trimming.
            // We might add different validation for captions later if needed.

            setTimeout(() => {
              toast({ title: "Clip Trimmed", description: `Clip ${clip.name} updated.`});
            }, 0);
            return { ...clip, sourceStart: updatedStart, sourceEnd: updatedEnd };
          }
          return clip;
        })
      }))
    );
  }, [mediaLibrary, toast]);


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
         <SidebarInset>
          <div className="flex flex-col h-full overflow-auto"> {/* Added overflow-auto here */}
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto"> {/* Kept overflow-y-auto for vertical */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2 space-y-4">
                  <VideoPreview
                    tracks={tracks}
                    mediaLibrary={mediaLibrary}
                    globalCurrentTime={globalCurrentTime}
                    isGlobalPlaying={isGlobalPlaying}
                    projectDuration={projectDuration}
                    onTogglePlayPause={handleToggleGlobalPlayPause}
                    onSeek={handleGlobalSeek}
                  />
                  <TimelineControls
                    selectedClip={selectedClipForControls}
                    onUpdateClipTimes={handleUpdateClipTimes}
                  />
                </div>
                <div className="xl:col-span-1 space-y-4">
                  <MediaImportArea onFileUpload={addMediaFileToLibraryAndTimeline} />
                  <Toolbox
                    onAddMediaToTimeline={addMediaFileToLibraryAndTimeline}
                    onDeleteSelectedClip={handleDeleteSelectedClip}
                  />
                </div>
              </div>
              <div className="h-[300px] min-h-[200px] flex flex-col">
                <Timeline
                  tracks={tracks}
                  projectDuration={projectDuration}
                  selectedClipId={selectedClipId}
                  onClipSelect={handleSelectClip}
                  globalCurrentTime={globalCurrentTime}
                />
              </div>
            </main>
          </div>
        </SidebarInset>
        <AiEditorSidebar
          onGenerateSubtitles={handleGenerateSubtitles}
          selectedClip={selectedClipForControls}
          mediaLibrary={mediaLibrary}
          onUpdateClipTimes={handleUpdateClipTimes}
        />
      </div>
    </SidebarProvider>
  );
}
