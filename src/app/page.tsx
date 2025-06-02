
import AppHeader from "@/components/vidgenius/AppHeader";
import MediaImportArea from "@/components/vidgenius/MediaImportArea";
import Toolbox from "@/components/vidgenius/Toolbox";
import VideoPreview from "@/components/vidgenius/VideoPreview";
import Timeline from "@/components/vidgenius/Timeline";
import AiEditorSidebar from "@/components/vidgenius/AiEditorSidebar";
import TimelineControls from "@/components/vidgenius/TimelineControls";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";


export default function VidGeniusPage() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* SidebarInset (main content) now comes before AiEditorSidebar */}
        <SidebarInset> 
          {/* This div will handle scrolling for its content */}
          <div className="flex flex-col h-full overflow-auto"> 
            <AppHeader />
            {/* Removed overflow-y-auto from main as parent div now handles it */}
            <main className="flex-1 p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
                <div className="xl:col-span-2 space-y-4">
                    <VideoPreview />
                    <TimelineControls/>
                </div>
                <div className="xl:col-span-1 space-y-4">
                  <MediaImportArea />
                  <Toolbox />
                </div>
              </div>
              <div className="h-[300px] min-h-[200px] flex flex-col">
                <Timeline />
              </div>
            </main>
          </div>
        </SidebarInset>
        <AiEditorSidebar /> {/* This is the <Sidebar> from ui/sidebar, configured as right sidebar */}
      </div>
    </SidebarProvider>
  );
}
