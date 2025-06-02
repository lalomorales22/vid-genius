
"use client";

import React, { useState, useCallback } from 'react';
import AppHeader from "@/components/vidgenius/AppHeader";
import MediaImportArea from "@/components/vidgenius/MediaImportArea";
import Toolbox from "@/components/vidgenius/Toolbox";
import VideoPreview from "@/components/vidgenius/VideoPreview";
import Timeline from "@/components/vidgenius/Timeline";
import AiEditorSidebar from "@/components/vidgenius/AiEditorSidebar";
import TimelineControls from "@/components/vidgenius/TimelineControls";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export interface MediaFile {
  id: string;
  name: string;
  type: string;
  dataUri: string;
  duration: number;
}

export default function VidGeniusPage() {
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null);
  const [audioFiles, setAudioFiles] = useState<MediaFile[]>([]);

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
      };
      mediaElement.src = objectUrl;
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const dataUri = await readFileAsDataURL(file);
      const objectUrl = URL.createObjectURL(file);
      const duration = await getMediaDuration(file, objectUrl);
      URL.revokeObjectURL(objectUrl); // Clean up

      const newMediaFile: MediaFile = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        type: file.type,
        dataUri,
        duration,
      };

      if (file.type.startsWith('video/')) {
        setVideoFile(newMediaFile);
      } else if (file.type.startsWith('audio/')) {
        setAudioFiles((prevAudioFiles) => [...prevAudioFiles, newMediaFile]);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      // Optionally, show a toast notification for the error
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <SidebarInset>
          <div className="flex flex-col h-full overflow-auto">
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2 space-y-4">
                  <VideoPreview mediaFile={videoFile} />
                  <TimelineControls />
                </div>
                <div className="xl:col-span-1 space-y-4">
                  <MediaImportArea onFileUpload={handleFileUpload} />
                  <Toolbox />
                </div>
              </div>
              <div className="h-[300px] min-h-[200px] flex flex-col">
                <Timeline videoMedia={videoFile} audioMediaList={audioFiles} />
              </div>
            </main>
          </div>
        </SidebarInset>
        <AiEditorSidebar />
      </div>
    </SidebarProvider>
  );
}
