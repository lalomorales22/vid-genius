
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
  mediaFileId: string; // For video/audio, points to MediaFile. Empty for captions.
  trackId: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  sourceStart: number; // in seconds, within the original media file (if applicable)
  sourceEnd: number;   // in seconds, within the original media file (if applicable)
  timelineStart: number; // in seconds, on the project timeline
  color: string;
  text?: string; // For captions
  // Future: x, y, fontSize, textColor for captions
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  clips: Clip[];
}

const DEFAULT_PROJECT_DURATION = 60; // seconds
const DEFAULT_CAPTION_DURATION = 5; // seconds

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
          clipDuration = clip.sourceEnd - clip.sourceStart; // Captions use sourceStart/End for duration
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
    const newCurrentTime = globalCurrentTime + elapsedSinceLoopStart; 

    setGlobalCurrentTime(prevTime => {
      const currentDelta = (Date.now() - animationLoopStartTimeRef.current) / 1000;
      animationLoopStartTimeRef.current = Date.now(); 
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
        setIsGlobalPlaying(false); 
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
        if (globalCurrentTime >= projectDuration && projectDuration > 0) { 
          effectiveCurrentTime = 0;
          setGlobalCurrentTime(0);
        }
        animationLoopStartTimeRef.current = Date.now(); 
        
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
      animationLoopStartTimeRef.current = Date.now(); 
      if (!requestAnimationFrameIdRef.current) { 
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
        timelineStart: 0, 
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

  const handleAddTextCaption = useCallback((text: string) => {
    if (!text.trim()) {
      setTimeout(() => {
        toast({ title: "Empty Text", description: "Cannot add an empty caption.", variant: "default" });
      }, 0);
      return;
    }

    const newClipId = `caption-clip-${Date.now()}`;
    let targetTrackId = '';
    let targetTrackName = '';

    const existingCaptionTracks = tracks.filter(t => t.type === 'caption');
    if (existingCaptionTracks.length > 0) {
      // Add to the first existing caption track for simplicity, or create new if desired
      targetTrackId = existingCaptionTracks[0].id;
    } else {
      targetTrackId = `track-caption-${Date.now()}`;
      targetTrackName = `Caption Track 1`;
    }
    
    const newCaptionClip: Clip = {
      id: newClipId,
      mediaFileId: '', // No media file for text captions
      trackId: targetTrackId,
      name: `Caption: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
      type: 'caption',
      sourceStart: 0, // For captions, sourceStart is 0
      sourceEnd: DEFAULT_CAPTION_DURATION, // And sourceEnd is the duration
      timelineStart: globalCurrentTime, // Add at current playhead time
      color: 'bg-yellow-500',
      text: text,
    };

    setTracks(prevTracks => {
      let trackExists = false;
      const updatedTracks = prevTracks.map(track => {
        if (track.id === targetTrackId) {
          trackExists = true;
          return { ...track, clips: [...track.clips, newCaptionClip] };
        }
        return track;
      });

      if (!trackExists) {
        const newTrack: Track = {
          id: targetTrackId,
          name: targetTrackName || `Caption Track ${existingCaptionTracks.length + 1}`,
          type: 'caption',
          clips: [newCaptionClip],
        };
        return [...updatedTracks, newTrack];
      }
      return updatedTracks;
    });

    setTimeout(() => {
      toast({ title: "Text Caption Added", description: `"${newCaptionClip.name}" added to the timeline.` });
    }, 0);

  }, [tracks, toast, globalCurrentTime]);

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
        mediaFileId: '', 
        trackId: '', 
        name: `Subtitles for ${selectedClip.name}`,
        type: 'caption',
        sourceStart: 0, 
        sourceEnd: DEFAULT_CAPTION_DURATION, // Default duration, can be adjusted
        timelineStart: selectedClip.timelineStart, 
        color: 'bg-yellow-500',
        text: result.captions,
      };

      let captionTrack = tracks.find(t => t.type === 'caption' && t.name.includes("Caption Track")); 
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
          return null;
        }
        return { ...track, clips: filteredClips };
      }).filter(track => track !== null) as Track[]; 

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

  const handleUpdateClipTimes = useCallback((clipId: string, newTimes: { sourceStart?: number; sourceEnd?: number; timelineStart?: number }) => {
    setTracks(prevTracks =>
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const mediaFile = mediaLibrary.find(mf => mf.id === clip.mediaFileId);
            
            let updatedStart = newTimes.sourceStart !== undefined ? newTimes.sourceStart : clip.sourceStart;
            let updatedEnd = newTimes.sourceEnd !== undefined ? newTimes.sourceEnd : clip.sourceEnd;
            let updatedTimelineStart = newTimes.timelineStart !== undefined ? newTimes.timelineStart : clip.timelineStart;

            if (clip.type === 'caption') {
              // For captions, sourceStart is usually 0, sourceEnd is duration.
              // timelineStart can be updated freely.
              updatedStart = Math.max(0, updatedStart);
              if (updatedStart >= updatedEnd) {
                updatedEnd = updatedStart + 0.1; // Ensure min duration
              }
            } else if (mediaFile) { // Video or Audio clips
              updatedStart = Math.max(0, updatedStart);
              updatedEnd = Math.min(mediaFile.duration, updatedEnd);

              if (updatedStart >= updatedEnd) {
                if (newTimes.sourceStart !== undefined && newTimes.sourceEnd === undefined) { 
                  updatedStart = Math.min(updatedStart, clip.sourceEnd - 0.1);
                } else if (newTimes.sourceEnd !== undefined && newTimes.sourceStart === undefined) { 
                  updatedEnd = Math.max(updatedEnd, clip.sourceStart + 0.1);
                } else { 
                   updatedStart = Math.min(updatedStart, mediaFile.duration - 0.1);
                   updatedEnd = updatedStart + 0.1; 
                }
                updatedEnd = Math.min(mediaFile.duration, updatedEnd);
                updatedStart = Math.max(0, updatedStart);

                 if (updatedStart >= updatedEnd) { 
                   setTimeout(() => {
                     toast({ title: "Invalid trim", description: "Clip start time must be before end time and within media bounds.", variant: "destructive"});
                   }, 0);
                   return clip; 
                 }
              }
            } else { // No media file and not a caption, shouldn't happen for video/audio
              return clip;
            }

            setTimeout(() => {
              toast({ title: "Clip Updated", description: `Clip ${clip.name} updated.`});
            }, 0);
            return { ...clip, sourceStart: updatedStart, sourceEnd: updatedEnd, timelineStart: updatedTimelineStart };
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
          <div className="flex flex-col h-full overflow-auto"> 
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto"> 
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
                    onAddTextCaption={handleAddTextCaption}
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
                  onUpdateClipTimes={handleUpdateClipTimes}
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
