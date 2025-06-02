
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
        <AiEditorSidebar /> {/* This is the <Sidebar> from ui/sidebar, configured as right sidebar */}
        
        <SidebarInset> {/* This is the main content area that adjusts with the sidebar */}
          <div className="flex flex-col h-full">
            <AppHeader />
            <main className="flex-1 p-4 lg:p-6 space-y-4 overflow-y-auto">
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
              <div className="h-[300px] min-h-[200px] flex flex-col"> {/* Set explicit height for Timeline container */}
                <Timeline />
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
