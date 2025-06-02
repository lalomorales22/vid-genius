
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import React from "react";
import { useToast } from "@/hooks/use-toast";

interface MediaImportAreaProps {
  onFileUpload: (file: File) => void; // Changed to pass File object directly
}

export default function MediaImportArea({ onFileUpload }: MediaImportAreaProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFiles = (files: FileList | null) => {
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
          onFileUpload(file); // Pass the File object
        } else {
          toast({
            title: "Unsupported File Type",
            description: `File "${file.name}" is not a supported video or audio format.`,
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(event.target.files);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    processFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-headline">Import Media</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
          onClick={handleAreaClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAreaClick(); }}
          aria-label="Import media area"
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag & drop video/audio files here
          </p>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90 pointer-events-none">
            Or click to upload
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="video/*,audio/*"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Supports video and audio files.
        </p>
      </CardContent>
    </Card>
  );
}
