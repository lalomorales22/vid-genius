
"use client";

import React, { useState, useCallback } from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Clip, MediaFile } from "@/app/page";

interface AiEditorSidebarProps {
  onGenerateSubtitles: (language?: string) => Promise<any | null>;
  onAiEditClip: (promptText: string) => Promise<void>; // New prop for AI editing
  selectedClip: Clip | null;
  mediaLibrary: MediaFile[]; // Keep if needed for other AI features, or remove if only onAiEditClip uses it
  onUpdateClipTimes: (clipId: string, newTimes: { sourceStart?: number; sourceEnd?: number }) => void; // Keep if other direct manipulations happen here
}

export default function AiEditorSidebar({ 
  onGenerateSubtitles, 
  onAiEditClip,
  selectedClip,
  mediaLibrary, // Included for context, may or may not be directly used by all sidebar functions
  onUpdateClipTimes // Included for context
}: AiEditorSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoadingAiEdit, setIsLoadingAiEdit] = useState(false);
  const [isGeneratingSubs, setIsGeneratingSubs] = useState(false);
  const { toast } = useToast();

  const handleAiEditVideoClick = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a prompt for the AI editor.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedClip) {
      toast({
        title: "No clip selected",
        description: "Please select a video or audio clip to edit.",
        variant: "default",
      });
      return;
    }
     if (selectedClip.type === 'caption') {
       toast({
        title: "Invalid Clip Type",
        description: "AI editing is currently supported for video/audio clips only.",
        variant: "default",
      });
      return;
    }

    setIsLoadingAiEdit(true);
    toast({
      title: "AI Editing in Progress",
      description: "The AI is processing your video edit request...",
    });

    try {
      await onAiEditClip(prompt); // Call the new prop function
      setPrompt(""); 
    } catch (error) {
      // Error handling is now primarily in onAiEditClip in page.tsx
      // but you can add a generic fallback here if needed
      console.error("AI Video Editing Error (Sidebar Fallback):", error);
      toast({
        title: "AI Video Editing Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAiEdit(false);
    }
  };

  const handleGenerateSubtitlesClick = async () => {
    if (!selectedClip || selectedClip.type !== 'video') {
      toast({
        title: "Select a Video Clip",
        description: "Please select a video clip on the timeline to generate subtitles.",
        variant: "default",
      });
      return;
    }
    setIsGeneratingSubs(true);
    toast({
      title: "Generating Subtitles...",
      description: "AI is working on creating captions.",
    });
    await onGenerateSubtitles(); 
    setIsGeneratingSubs(false);
  };


  return (
    <Sidebar side="right" collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold font-headline">AI Video Editor</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4 space-y-6">
        <SidebarGroup>
          <SidebarGroupLabel>Generate Subtitles</SidebarGroupLabel>
          <p className="text-xs text-muted-foreground mb-2">
            Automatically create subtitles for the selected video clip.
          </p>
          <Button 
            onClick={handleGenerateSubtitlesClick} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={isGeneratingSubs || isLoadingAiEdit || !selectedClip || selectedClip.type !== 'video'}
          >
            {isGeneratingSubs ? "Generating..." : "Generate Subtitles"}
            {!isGeneratingSubs && <Type className="ml-2 h-4 w-4" />}
          </Button>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>AI Prompt Editing</SidebarGroupLabel>
          <p className="text-sm text-muted-foreground">
            Describe the changes you want. e.g., &quot;Cut the first 5 seconds&quot;, &quot;Make the video black and white&quot;.
          </p>
          <Textarea
            placeholder="Enter your editing prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] focus:ring-accent"
            disabled={isLoadingAiEdit || isGeneratingSubs}
          />
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <Button onClick={handleAiEditVideoClick} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoadingAiEdit || isGeneratingSubs || !selectedClip || selectedClip.type === 'caption'}>
          {isLoadingAiEdit ? "Processing..." : "Apply Edits with AI"}
          {!isLoadingAiEdit && <Send className="ml-2 h-4 w-4" />}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
