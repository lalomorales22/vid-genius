
"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Film, Baseline, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ToolboxProps {
  onAddMediaToTimeline: (file: File) => void;
  onDeleteSelectedClip: () => void;
  onAddTextCaption: (text: string) => void;
}

export default function Toolbox({ onAddMediaToTimeline, onDeleteSelectedClip, onAddTextCaption }: ToolboxProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'video') => {
    const file = event.target.files?.[0];
    if (file) {
      if ((type === 'audio' && file.type.startsWith('audio/')) || (type === 'video' && file.type.startsWith('video/'))) {
        onAddMediaToTimeline(file);
      } else {
        toast({
          title: "Incorrect File Type",
          description: `Please select a${type === 'audio' ? 'n audio' : ' video'} file.`,
          variant: "destructive",
        });
      }
    }
    if (event.target) {
        event.target.value = "";
    }
  };

  const handleAddTextClick = () => {
    const text = window.prompt("Enter the text for your caption:");
    if (text) { // Proceed if user entered text and didn't cancel
      onAddTextCaption(text);
    } else if (text === "") { // User entered empty string
        toast({
            title: "Empty Caption",
            description: "You cannot add an empty caption.",
            variant: "default"
        });
    }
    // If user cancels (text is null), do nothing.
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-headline">Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start border-primary text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => audioInputRef.current?.click()}
        >
          <Music2 className="mr-2 h-5 w-5" /> Add Music/Sound
        </Button>
        <input 
          type="file" 
          ref={audioInputRef} 
          className="hidden" 
          accept="audio/*" 
          onChange={(e) => handleFileSelect(e, 'audio')} 
        />

        <Button 
          variant="outline" 
          className="w-full justify-start border-primary text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => videoInputRef.current?.click()}
        >
          <Film className="mr-2 h-5 w-5" /> Add Video/Image
        </Button>
        <input 
          type="file" 
          ref={videoInputRef} 
          className="hidden" 
          accept="video/*" 
          onChange={(e) => handleFileSelect(e, 'video')}
        />

        <Button 
          variant="outline" 
          className="w-full justify-start border-accent text-accent hover:bg-accent/10 hover:text-accent" 
          onClick={handleAddTextClick}
        >
          <Baseline className="mr-2 h-5 w-5" /> Add Text/Captions
        </Button>
        <Button variant="destructive" className="w-full justify-start" onClick={onDeleteSelectedClip}>
          <Trash2 className="mr-2 h-5 w-5" /> Delete Selected
        </Button>
      </CardContent>
    </Card>
  );
}
