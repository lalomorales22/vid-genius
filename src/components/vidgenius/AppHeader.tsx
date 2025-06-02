
"use client";

import { Button } from "@/components/ui/button";
import { Download, Menu, Bot } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";

export default function AppHeader() {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <header className="h-16 px-4 lg:px-6 flex items-center justify-between border-b bg-card shrink-0">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle AI Editor">
            <Bot className="h-5 w-5" />
          </Button>
        )}
        <Link href="/" className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-primary">
            <path d="M6.53221 3.32569C6.93531 2.44894 7.96913 1.96705 8.91526 2.1708L19.6473 4.50411C20.5934 4.70786 21.3057 5.55178 21.368 6.51081L21.868 14.9108C21.9303 15.8698 21.2803 16.7601 20.3767 17.0703L9.64472 20.8036C8.74109 21.1138 7.77823 20.6781 7.34493 19.8469L2.13321 10.4469C1.70008 9.6157 2.00336 8.59304 2.79178 8.06833L6.53221 3.32569Z" />
            <path d="M8.5 8V16L15.5 12L8.5 8Z" fill="hsl(var(--primary-foreground))"/>
          </svg>
          <h1 className="text-xl font-bold font-headline">VidGenius</h1>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Download className="mr-2 h-4 w-4" />
          Export Video
        </Button>
        {!isMobile && (
           <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle AI Editor">
             <Bot className="h-5 w-5" />
           </Button>
        )}
      </div>
    </header>
  );
}
