
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
          clipDuration = clip.sourceEnd - clip.sourceStart;
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

      const trackType = file.type.startsWith('video/') ? 'video' : 'audio';
      let targetTrack: Track | undefined;
      let newClipTimelineStart = 0;
      let toastMessage: string;
      let newTrackIdPrefix = trackType === 'video' ? 'video-track' : 'audio-track';
      
      setTracks((prevTracks) => {
        const existingTracksOfType = prevTracks.filter(t => t.type === trackType);
        if (existingTracksOfType.length > 0) {
          // Add to the first existing track of this type
          targetTrack = existingTracksOfType[0];
          if (targetTrack.clips.length > 0) {
            const lastClip = targetTrack.clips[targetTrack.clips.length - 1];
            newClipTimelineStart = lastClip.timelineStart + (lastClip.sourceEnd - lastClip.sourceStart);
          }
          toastMessage = `${newMediaFile.name} added to ${targetTrack.name}.`;

          const newClip: Clip = {
            id: `clip-${newMediaFile.id}-${Date.now()}`,
            mediaFileId: newMediaFile.id,
            trackId: targetTrack.id,
            name: newMediaFile.name,
            type: trackType,
            sourceStart: 0,
            sourceEnd: newMediaFile.duration,
            timelineStart: newClipTimelineStart,
            color: trackType === 'video' ? 'bg-blue-500' : 'bg-green-500',
          };

          return prevTracks.map(t => 
            t.id === targetTrack!.id 
              ? { ...t, clips: [...t.clips, newClip] } 
              : t
          );

        } else {
          // Create new track
          const newTrackName = `${trackType.charAt(0).toUpperCase() + trackType.slice(1)} Track 1`;
          const newTrackId = `${newTrackIdPrefix}-${Date.now()}-1`;
          targetTrack = {
            id: newTrackId,
            name: newTrackName,
            type: trackType,
            clips: [],
          };
          toastMessage = `${newMediaFile.name} added to new track: ${targetTrack.name}.`;

           const newClip: Clip = {
            id: `clip-${newMediaFile.id}-${Date.now()}`,
            mediaFileId: newMediaFile.id,
            trackId: targetTrack.id,
            name: newMediaFile.name,
            type: trackType,
            sourceStart: 0,
            sourceEnd: newMediaFile.duration,
            timelineStart: newClipTimelineStart, // Will be 0
            color: trackType === 'video' ? 'bg-blue-500' : 'bg-green-500',
          };
          return [...prevTracks, { ...targetTrack, clips: [newClip] }];
        }
      });
      
      setTimeout(() => {
        toast({
          title: "Media Added",
          description: toastMessage,
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
  }, [toast]);


  const handleAddTextCaption = useCallback((text: string) => {
    if (!text.trim()) {
      setTimeout(() => {
        toast({ title: "Empty Text", description: "Cannot add an empty caption.", variant: "default" });
      }, 0);
      return;
    }

    setTracks(prevTracks => {
      const newClipId = `caption-clip-${Date.now()}`;
      const captionTrackCount = prevTracks.filter(t => t.type === 'caption' && t.name.startsWith("Caption Track")).length;
      const targetTrackId = `track-caption-manual-${Date.now()}-${captionTrackCount + 1}`;
      const targetTrackName = `Caption Track ${captionTrackCount + 1}`;

      const newCaptionClip: Clip = {
        id: newClipId,
        mediaFileId: '', // No media file for text captions
        trackId: targetTrackId,
        name: `Caption: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
        type: 'caption',
        sourceStart: 0, 
        sourceEnd: DEFAULT_CAPTION_DURATION, 
        timelineStart: globalCurrentTime, // Start at current playhead
        color: 'bg-yellow-500',
        text: text,
      };

      const newTrack: Track = {
        id: targetTrackId,
        name: targetTrackName,
        type: 'caption',
        clips: [newCaptionClip],
      };

      setTimeout(() => {
        toast({ title: "Text Caption Added", description: `"${newCaptionClip.name}" added to ${newTrack.name}.` });
      }, 0);
      return [...prevTracks, newTrack];
    });
  }, [toast, globalCurrentTime]);


 const handleGenerateSubtitles = useCallback(async (language: string = "en"): Promise<GenerateCaptionsOutput | null> => {
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
      
      setTracks(prevTracks => {
        const aiCaptionTrackName = `AI Subtitles for ${selectedClip.name.substring(0,15)}`;
        const newTrackId = `track-caption-ai-${Date.now()}`;

        const newCaptionClip: Clip = {
          id: `caption-ai-${Date.now()}`,
          mediaFileId: '',
          trackId: newTrackId,
          name: `AI Subtitles`,
          type: 'caption',
          sourceStart: 0,
          sourceEnd: result.captions.length > 0 ? DEFAULT_CAPTION_DURATION : 0, // Adjust if captions are empty
          timelineStart: selectedClip.timelineStart,
          color: 'bg-teal-500',
          text: result.captions,
        };

        const newTrack: Track = {
          id: newTrackId,
          name: aiCaptionTrackName,
          type: 'caption',
          clips: [newCaptionClip],
        };
        
        setTimeout(() => {
          toast({ title: "AI Subtitles Generated", description: `Captions added for ${selectedClip.name} on a new track: ${aiCaptionTrackName}.` });
        }, 0);
        return [...prevTracks, newTrack];
      });
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
      let manualCaptionCount = 0;
      
      return newTracks.map(track => {
        let newName = track.name;
        if (track.type === 'video' && track.name.startsWith("Video Track")) {
            trackCounts.video++;
            newName = `Video Track ${trackCounts.video}`;
        } else if (track.type === 'audio' && track.name.startsWith("Audio Track")) {
            trackCounts.audio++;
            newName = `Audio Track ${trackCounts.audio}`;
        } else if (track.type === 'caption') {
            if (track.name.startsWith("AI Subtitles for")) {
                 newName = track.name; 
            } else if (track.name.startsWith("Caption Track")) { 
                manualCaptionCount++;
                newName = `Caption Track ${manualCaptionCount}`;
            }
        }
        return { ...track, name: newName };
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
              updatedStart = Math.max(0, updatedStart); 
              if (newTimes.sourceEnd !== undefined) {
                 updatedEnd = Math.max(0.1, updatedEnd); 
              } else {
                if (updatedStart >= clip.sourceEnd) { 
                    updatedEnd = updatedStart + 0.1;
                } else {
                    updatedEnd = clip.sourceEnd;
                }
              }
              if (updatedEnd <= updatedStart) updatedEnd = updatedStart + 0.1;

            } else if (mediaFile) { 
              updatedStart = Math.max(0, updatedStart);
              updatedEnd = Math.min(mediaFile.duration, updatedEnd);

              if (updatedStart >= updatedEnd) {
                if (newTimes.sourceStart !== undefined && newTimes.sourceEnd === undefined) { // Only start changed
                  updatedStart = Math.min(updatedStart, clip.sourceEnd - 0.1);
                }
                else if (newTimes.sourceEnd !== undefined && newTimes.sourceStart === undefined) { // Only end changed
                  updatedEnd = Math.max(updatedEnd, clip.sourceStart + 0.1);
                }
                else { // Both changed or one implies the other is invalid
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
            } else { 
              return clip;
            }

            const updatedClip = { ...clip, sourceStart: updatedStart, sourceEnd: updatedEnd, timelineStart: updatedTimelineStart };
            setTimeout(() => {
              toast({ title: "Clip Updated", description: `Clip ${clip.name} times updated.`});
            }, 0);
            return updatedClip;
          }
          return clip;
        })
      }))
    );
  }, [mediaLibrary, toast]);

  const handleAiEditClip = useCallback(async (promptText: string) => {
    if (!selectedClipId) {
      setTimeout(() => {
        toast({ title: "No Clip Selected", description: "Please select a clip to edit with AI.", variant: "default" });
      }, 0);
      return;
    }
    const clipToEdit = tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);
    if (!clipToEdit || clipToEdit.type === 'caption') {
       setTimeout(() => {
        toast({ title: "Invalid Clip", description: "AI editing is for video/audio clips.", variant: "default" });
      }, 0);
      return;
    }
    const mediaFile = mediaLibrary.find(mf => mf.id === clipToEdit.mediaFileId);
    if (!mediaFile) {
       setTimeout(() => {
        toast({ title: "Media Not Found", description: "Source media for the clip is missing.", variant: "destructive" });
      }, 0);
      return;
    }

    try {
      const input: EditVideoWithAIInput = {
        videoDataUri: mediaFile.dataUri, // For AI context, actual trimming is via parameters
        prompt: promptText,
      };
      const result: EditVideoWithAIOutput = await editVideoWithAI(input);

      let changesMade = false;
      const updates: { sourceStart?: number; sourceEnd?: number } = {};

      if (result.newSourceStart !== undefined && result.newSourceStart !== clipToEdit.sourceStart) {
        updates.sourceStart = result.newSourceStart;
        changesMade = true;
      }
      if (result.newSourceEnd !== undefined && result.newSourceEnd !== clipToEdit.sourceEnd) {
        updates.sourceEnd = result.newSourceEnd;
        changesMade = true;
      }
      
      if (changesMade) {
        handleUpdateClipTimes(clipToEdit.id, updates);
        setTimeout(() => {
          toast({ title: "AI Edits Applied", description: `Clip "${clipToEdit.name}" updated based on AI suggestion.` });
        }, 0);
      } else {
         setTimeout(() => {
          toast({ title: "AI Suggestion", description: "AI processed the prompt, but no direct trim changes were suggested or applicable.", variant: "default" });
        }, 0);
      }
    } catch (error) {
      console.error("AI Editing Error:", error);
      setTimeout(() => {
        toast({ title: "AI Editing Failed", description: "Could not apply AI edits.", variant: "destructive" });
      }, 0);
    }
  }, [selectedClipId, tracks, mediaLibrary, toast, handleUpdateClipTimes]);


  const handleExportVideo = useCallback(async () => {
    const exportData = {
      projectDuration,
      tracks,
      mediaLibrary: mediaLibrary.map(mf => ({ // Send only metadata, not full data URIs for export summary
        id: mf.id,
        name: mf.name,
        type: mf.type,
        duration: mf.duration
        // dataUri is omitted to keep payload small for this example
      })),
    };

    setTimeout(() => {
      toast({
        title: "Sending to Server...",
        description: "Preparing video data for export.",
      });
    }, 0);

    try {
      const response = await fetch('http://localhost:3001/api/export-video', { // Absolute URL for the Express server
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData), // Ensure this is a string
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        if (response.ok && result.success) {
          setTimeout(() => {
            toast({
              title: "Export Request Sent",
              description: result.message || "Server has received the video data.",
              duration: 7000,
            });
          }, 0);
        } else {
          throw new Error(result.message || `Server error: ${response.status}`);
        }
      } else {
        // Handle non-JSON responses (e.g., HTML error pages if the server is misconfigured or down)
        const textResponse = await response.text();
        console.error("Non-JSON response from server:", textResponse);
        throw new Error(`Server returned a non-JSON response. Status: ${response.status}. Check server logs.`);
      }

    } catch (error) {
      console.error("Export Video Error:", error);
      let description = `Could not send data to server: ${error instanceof Error ? error.message : "Unknown error"}`;
      if (error instanceof TypeError && (error.message.toLowerCase().includes('failed to fetch') || error.message.toLowerCase().includes('networkerror'))) {
        description = "Failed to connect to the export server. Please ensure the Node.js server (server.js) is running on port 3001 (e.g., 'npm run server') and check its console for errors.";
      }
      setTimeout(() => {
        toast({
          title: "Export Failed",
          description: description,
          variant: "destructive",
          duration: 10000,
        });
      }, 0);
    }
  }, [toast, projectDuration, tracks, mediaLibrary]);


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
         <SidebarInset>
          <div className="flex flex-col h-full overflow-auto">
            <AppHeader onExportVideo={handleExportVideo} />
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
          onAiEditClip={handleAiEditClip}
          selectedClip={selectedClipForControls}
          mediaLibrary={mediaLibrary}
          onUpdateClipTimes={handleUpdateClipTimes}
        />
      </div>
    </SidebarProvider>
  );
}


