
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import AppHeader from "@/components/vidgenius/AppHeader";
import MediaImportArea from "@/components/vidgenius/MediaImportArea";
import Toolbox from "@/components/vidgenius/Toolbox";
import VideoPreview, { type PreviewableItem } from "@/components/vidgenius/VideoPreview";
import Timeline from "@/components/vidgenius/Timeline";
import AiEditorSidebar from "@/components/vidgenius/AiEditorSidebar";
import TimelineControls from "@/components/vidgenius/TimelineControls";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";

export interface MediaFile {
  id: string;
  name: string;
  type: string; // MIME type
  dataUri: string;
  duration: number; // in seconds
}

export interface Clip {
  id: string;
  mediaFileId: string;
  trackId: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  sourceStart: number; 
  sourceEnd: number;   
  timelineStart: number;
  color: string;
  text?: string;
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  clips: Clip[];
}

const DEFAULT_PROJECT_DURATION = 60;

export default function VidGeniusPage() {
  const [mediaLibrary, setMediaLibrary] = useState<MediaFile[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const { toast } = useToast();

  const projectDuration = useMemo(() => {
    if (tracks.length === 0) {
      return DEFAULT_PROJECT_DURATION;
    }
    let maxEndTime = 0;
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEndTime = clip.timelineStart + (clip.sourceEnd - clip.sourceStart);
        if (clipEndTime > maxEndTime) {
          maxEndTime = clipEndTime;
        }
      });
    });
    return Math.max(DEFAULT_PROJECT_DURATION, maxEndTime);
  }, [tracks]);

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
        URL.revokeObjectURL(objectUrl); // Revoke here after duration is read
        mediaElement.remove();
      };
      mediaElement.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(objectUrl); // Also revoke on error
        mediaElement.remove();
        console.error("Error loading media metadata for duration check");
      }
      mediaElement.src = objectUrl;
    });
  };

  const addMediaFileToLibraryAndTimeline = useCallback(async (file: File) => {
    try {
      const dataUri = await readFileAsDataURL(file);
      const objectUrlForDuration = URL.createObjectURL(file); // Create new URL for duration check
      const duration = await getMediaDuration(file, objectUrlForDuration);
      // URL.revokeObjectURL(objectUrlForDuration) is handled inside getMediaDuration

      if (duration === 0 && (file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
        toast({
          title: "Media Processing Error",
          description: `Could not determine duration for ${file.name}. It might be corrupted or an unsupported format.`,
          variant: "destructive",
        });
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
      toast({
        title: "Media Added",
        description: `${newMediaFile.name} added to timeline.`,
      });

    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "File Upload Error",
        description: "There was an issue processing your file.",
        variant: "destructive",
      });
    }
  }, [tracks, toast]);


  const handleDeleteSelectedClip = useCallback(() => {
    if (!selectedClipId) {
      toast({ title: "No clip selected", description: "Please select a clip to delete.", variant: "default" });
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
    toast({ title: "Clip Deleted", description: "The selected clip has been removed." });
  }, [selectedClipId, toast]);

  const handleSelectClip = useCallback((clipId: string) => {
    setSelectedClipId(prevId => (prevId === clipId ? null : clipId));
  }, []);
  
  const previewableItem = useMemo<PreviewableItem | null>(() => {
    if (selectedClipId) {
      for (const track of tracks) {
        const clip = track.clips.find(c => c.id === selectedClipId);
        if (clip) {
          const mediaFile = mediaLibrary.find(mf => mf.id === clip.mediaFileId);
          if (mediaFile) {
            return { mediaFile, clip };
          }
        }
      }
    }
    // Fallback: find the first video media file's first clip
    const firstVideoTrack = tracks.find(t => t.type === 'video');
    if (firstVideoTrack && firstVideoTrack.clips.length > 0) {
      const firstClip = firstVideoTrack.clips[0];
      const mediaFile = mediaLibrary.find(mf => mf.id === firstClip.mediaFileId);
      if (mediaFile) {
        return { mediaFile, clip: firstClip };
      }
    }
    return null;
  }, [selectedClipId, tracks, mediaLibrary]);

  const handleUpdateClipTimes = useCallback((clipId: string, newTimes: { sourceStart?: number; sourceEnd?: number }) => {
    setTracks(prevTracks => 
      prevTracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const mediaFile = mediaLibrary.find(mf => mf.id === clip.mediaFileId);
            if (!mediaFile) return clip;

            let updatedStart = newTimes.sourceStart !== undefined ? newTimes.sourceStart : clip.sourceStart;
            let updatedEnd = newTimes.sourceEnd !== undefined ? newTimes.sourceEnd : clip.sourceEnd;

            updatedStart = Math.max(0, updatedStart);
            updatedEnd = Math.min(mediaFile.duration, updatedEnd);
            
            if (updatedStart >= updatedEnd) {
              // If start becomes greater or equal to end, try to keep a minimal duration or revert one of them
              if (newTimes.sourceStart !== undefined && newTimes.sourceEnd === undefined) { // User changed start
                updatedStart = Math.min(updatedStart, clip.sourceEnd - 0.1); // Ensure start is less than original end
              } else if (newTimes.sourceEnd !== undefined && newTimes.sourceStart === undefined) { // User changed end
                updatedEnd = Math.max(updatedEnd, clip.sourceStart + 0.1); // Ensure end is greater than original start
              } else { // Both changed or invalid state
                 updatedStart = Math.min(updatedStart, mediaFile.duration - 0.1);
                 updatedEnd = updatedStart + 0.1; // Force minimal duration if both make it invalid
              }
              updatedEnd = Math.min(mediaFile.duration, updatedEnd);
              updatedStart = Math.max(0, updatedStart);

               if (updatedStart >= updatedEnd) { // Final safety net
                 toast({ title: "Invalid trim", description: "Clip start time must be before end time and within media bounds.", variant: "destructive"});
                 return clip; // Revert to original clip if still invalid
               }

            }
            toast({ title: "Clip Trimmed", description: `Clip ${clip.name} updated.`});
            return { ...clip, sourceStart: updatedStart, sourceEnd: updatedEnd };
          }
          return clip;
        })
      }))
    );
  }, [mediaLibrary, toast]);

  const selectedClipForControls = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find(c => c.id === selectedClipId);
      if (clip) return clip;
    }
    return null;
  }, [selectedClipId, tracks]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
         <SidebarInset>
          <div className="flex flex-col h-full overflow-auto"> {/* Added overflow-auto here for main content area */}
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto"> 
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2 space-y-4">
                  <VideoPreview previewableItem={previewableItem} />
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
                />
              </div>
            </main>
          </div>
        </SidebarInset>
        <AiEditorSidebar />
      </div>
    </SidebarProvider>
  );
}

    