
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import AppHeader from "@/components/vidgenius/AppHeader";
import MediaImportArea from "@/components/vidgenius/MediaImportArea";
import Toolbox from "@/components/vidgenius/Toolbox";
import VideoPreview from "@/components/vidgenius/VideoPreview";
import Timeline from "@/components/vidgenius/Timeline";
import AiEditorSidebar from "@/components/vidgenius/AiEditorSidebar";
import TimelineControls from "@/components/vidgenius/TimelineControls";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";

// Represents an uploaded source file
export interface MediaFile {
  id: string;
  name: string;
  type: string; // MIME type
  dataUri: string;
  duration: number; // in seconds
}

// Represents a clip instance on the timeline, derived from a MediaFile
export interface Clip {
  id: string;
  mediaFileId: string; // ID of the source MediaFile
  trackId: string;
  name: string;
  type: 'video' | 'audio' | 'caption';
  sourceStart: number; // Start time within the original mediaFile (for trimming, initially 0)
  sourceEnd: number;   // End time within the original mediaFile (for trimming, initially mediaFile.duration)
  timelineStart: number; // Start time on the main project timeline (initially 0 for new tracks)
  color: string;
  text?: string; // For caption clips
}

// Represents a track on the timeline
export interface Track {
  id: string;
  name: string; // e.g., "Video Track 1", "Audio Track 1"
  type: 'video' | 'audio' | 'caption';
  clips: Clip[];
}

const DEFAULT_PROJECT_DURATION = 60; // 60 seconds

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
        mediaElement.remove(); // Clean up element
      };
      mediaElement.onerror = () => {
        resolve(0); // Resolve with 0 if there's an error loading metadata
        mediaElement.remove(); // Clean up element
        console.error("Error loading media metadata for duration check");
      }
      mediaElement.src = objectUrl;
    });
  };

  const addMediaFileToLibraryAndTimeline = useCallback(async (file: File) => {
    try {
      const dataUri = await readFileAsDataURL(file);
      const objectUrl = URL.createObjectURL(file);
      const duration = await getMediaDuration(file, objectUrl);
      URL.revokeObjectURL(objectUrl);

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

      const trackType = file.type.startsWith('video/') ? 'video' : 'audio';
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
        timelineStart: 0, // New clips on new tracks start at 0
        color: trackType === 'video' ? 'bg-blue-500' : 'bg-green-500',
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
      toast({ title: "No clip selected", description: "Please select a clip to delete.", variant: "destructive" });
      return;
    }

    setTracks(prevTracks => {
      const newTracks = prevTracks.map(track => {
        const filteredClips = track.clips.filter(clip => clip.id !== selectedClipId);
        // If all clips are removed from a track, remove the track itself
        if (filteredClips.length === 0 && track.clips.some(c => c.id === selectedClipId)) {
          return null; 
        }
        return { ...track, clips: filteredClips };
      }).filter(track => track !== null) as Track[]; // Filter out null tracks
      
      // If a track was removed, re-index subsequent tracks of the same type
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
    setSelectedClipId(prevId => (prevId === clipId ? null : clipId)); // Toggle selection
  }, []);
  
  const previewMedia = useMemo(() => {
    if (selectedClipId) {
      for (const track of tracks) {
        const clip = track.clips.find(c => c.id === selectedClipId);
        if (clip) {
          return mediaLibrary.find(mf => mf.id === clip.mediaFileId) || null;
        }
      }
    }
    // Fallback: find the first video media file in the library if no clip is selected
    // Or the first clip of the first video track
    const firstVideoTrack = tracks.find(t => t.type === 'video');
    if (firstVideoTrack && firstVideoTrack.clips.length > 0) {
      return mediaLibrary.find(mf => mf.id === firstVideoTrack.clips[0].mediaFileId) || null;
    }
    return mediaLibrary.find(mf => mf.type.startsWith('video/')) || null;
  }, [selectedClipId, tracks, mediaLibrary]);


  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
         <SidebarInset>
          <div className="flex flex-col h-full overflow-auto">
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-auto"> {/* Added overflow-auto here */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2 space-y-4">
                  <VideoPreview previewMedia={previewMedia} />
                  <TimelineControls />
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
