
# VidGenius - AI Powered Video Editor
<img width="1002" alt="Screenshot 2025-06-02 at 1 25 50 AM" src="https://github.com/user-attachments/assets/efdcd203-d2ef-44bd-8c62-53bb70f984e3" />

VidGenius is a web-based video editor that leverages the power of AI to simplify and enhance the video editing process. Built with a modern tech stack including Next.js, React, ShadCN UI, Tailwind CSS, and Genkit for AI functionalities, VidGenius aims to provide an intuitive interface for both basic and AI-assisted video editing tasks.

## 🎬 Features

-   **Media Import:** Easily upload your video and audio files.
-   **Timeline Editing:**
    -   Organize video, audio, and caption clips on separate tracks.
    -   Imported media of the same type (video/audio) are automatically consolidated onto a primary track for that type.
    -   Drag clips horizontally on the timeline to adjust their playback start time.
    -   A visual playhead indicates the current playback position, synchronized across the preview and timeline.
-   **Video Preview:**
    -   Centralized playback controls (play, pause, seek, skip forward/backward).
    -   Displays the video from the topmost active video track.
    -   Plays audio from all concurrently active audio tracks.
    -   Renders active text captions as overlays directly on the video.
    -   Mute/unmute audio and fullscreen video viewing options.
-   **Text Captions:**
    -   Manually add text captions. Each new caption is placed on its own distinct track.
    -   Text content is displayed as an overlay on the video preview during the caption's active duration.
-   **AI-Powered Features (via Genkit):**
    -   **Automatic Subtitle Generation:** Select a video clip and let the AI generate subtitles for it. These are added as a new caption track.
    -   **AI Prompt-Based Editing:** Select a video or audio clip and provide a text prompt (e.g., "trim the first 5 seconds," "make the clip 10 seconds long"). The AI suggests new start and end times for the clip's source media.
-   **Clip Trimming:**
    -   Manually adjust the `sourceStart` and `sourceEnd` times for any selected clip using dedicated input fields in the Timeline Controls panel.
-   **Export Video (Foundation):**
    -   An "Export Video" feature that sends the project's timeline structure and media metadata to a backend Node.js server.
    -   The backend server (included as `server.js`) acknowledges the request, providing a foundation for future full video processing implementation (e.g., using FFmpeg).
-   **Modern UI:**
    -   Clean and responsive user interface built with ShadCN UI components and styled with Tailwind CSS.
    -   Features a main editing workspace and a dedicated AI Editor sidebar.

## 🛠️ Tech Stack

-   **Frontend:** Next.js, React, TypeScript
-   **UI Components:** ShadCN UI
-   **Styling:** Tailwind CSS
-   **AI Integration:** Genkit (with Google AI models like Gemini)
-   **Backend (for Export Placeholder):** Node.js, Express

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or later recommended)
-   npm (comes with Node.js) or yarn

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/lalomorales22/vid-genius.git
    cd vid-genius
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root of your project. This file is used for Genkit API keys and other configurations. For example, if you are using Google AI Studio:
    ```env
    GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_API_KEY
    ```
    *(Ensure this file is added to your `.gitignore` if it contains sensitive keys and you plan to make your repository public.)*

### Running the Application

VidGenius requires three separate processes to be running concurrently in different terminal windows:

1.  **Next.js Frontend Application (VidGenius Editor):**
    This server handles the main user interface and client-side logic.
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.

2.  **Genkit Development Server (for AI Flows):**
    This server hosts your Genkit AI flows.
    ```bash
    npm run genkit:dev
    ```
    Or, for automatic reloading when AI flow files change:
    ```bash
    npm run genkit:watch
    ```
    The Genkit server usually starts on `http://localhost:3500` (or as configured by Genkit).

3.  **Node.js Backend Server (for Export Placeholder):**
    This server handles the `/api/export-video` endpoint.
    ```bash
    npm run server
    ```
    This Express server will start on `http://localhost:3001`.

Once all three servers are running, open your browser and navigate to `http://localhost:9002` to use VidGenius.

## 📖 How to Use

1.  **Import Media:**
    -   Drag & drop video or audio files into the "Import Media" area on the right.
    -   Alternatively, use the "Add Music/Sound" or "Add Video/Image" buttons in the "Tools" panel.

2.  **Arrange Clips on Timeline:**
    -   Imported media are automatically added to the timeline. Video files go to "Video Track X", audio to "Audio Track X".
    -   Click and drag clips horizontally along their track to change their start time.

3.  **Playback & Preview:**
    -   Use the controls below the video preview (play, pause, progress bar, skip buttons) to navigate your project.
    -   Active captions will display over the video.

4.  **Add Text/Captions Manually:**
    -   Click "Add Text/Captions" in the "Tools" panel.
    -   Enter the desired text when prompted.
    -   A new caption clip will be created on a new, dedicated caption track.

5.  **Utilize AI Features (AI Editor Sidebar):**
    -   Toggle the AI Editor sidebar using the "Bot" icon in the app header.
    -   **Generate Subtitles:** Select a video clip on the timeline, then click "Generate Subtitles" in the AI sidebar. The AI will generate captions and add them to a new track.
    -   **AI Prompt Editing:** Select a video or audio clip. In the AI sidebar, type an editing command (e.g., "cut the first 3 seconds," "make this clip 10 seconds long") into the prompt area and click "Apply Edits with AI." The AI will attempt to suggest new `sourceStart` and `sourceEnd` times for the selected clip.

6.  **Manual Clip Trimming:**
    -   Select any clip on the timeline.
    -   The "Timeline Controls" panel (below the video preview) will show "Start (s)" and "End (s)" fields.
    -   Modify these values to adjust which portion of the original media file is used for the clip. Click "Update" or blur the input field to apply changes.

7.  **Delete Clips:**
    -   Select a clip on the timeline.
    -   Click the "Delete Selected" button in the "Tools" panel.

8.  **Export Video (Placeholder):**
    -   Click the "Export Video" button in the App Header.
    -   This sends your project's structure to the backend server (running on port 3001). The server console will log that it received the data.
    -   *Note: Actual MP4 video file generation from this data is a placeholder and requires further backend implementation (e.g., using FFmpeg).*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

This project is open-source. (Consider adding a specific license like MIT if you wish).
```
