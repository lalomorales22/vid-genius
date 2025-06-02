
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Film, Baseline, Trash2 } from "lucide-react";

export default function Toolbox() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-headline">Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" className="w-full justify-start border-primary text-primary hover:bg-primary/10 hover:text-primary">
          <Music2 className="mr-2 h-5 w-5" /> Add Music/Sound
        </Button>
        <Button variant="outline" className="w-full justify-start border-primary text-primary hover:bg-primary/10 hover:text-primary">
          <Film className="mr-2 h-5 w-5" /> Add Video/Image
        </Button>
        <Button variant="outline" className="w-full justify-start border-accent text-accent hover:bg-accent/10 hover:text-accent">
          <Baseline className="mr-2 h-5 w-5" /> Add Text/Captions
        </Button>
        <Button variant="destructive" className="w-full justify-start">
          <Trash2 className="mr-2 h-5 w-5" /> Delete Selected
        </Button>
      </CardContent>
    </Card>
  );
}
