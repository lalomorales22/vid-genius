
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import React from "react";

export default function MediaImportArea() {
  // Basic handler for file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Process files
      console.log("Files selected:", event.target.files);
    }
  };

  // Input ref for triggering file dialog
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
          onDrop={(e) => { e.preventDefault(); console.log("Files dropped:", e.dataTransfer.files);}}
          onDragOver={(e) => e.preventDefault()}
        >
          <UploadCloud className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag & drop files here
          </p>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90">
            Or click to upload
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="video/*,audio/*,image/*"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Supports video, audio, and image files.
        </p>
      </CardContent>
    </Card>
  );
}
