
const express = require('express');
const path = require('path');
const cors = require('cors'); // Import cors

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes and origins (for development)
// For production, configure specific origins: app.use(cors({ origin: 'http://your-nextjs-app.com' }));
app.use(cors()); 

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Placeholder endpoint for video export
app.post('/api/export-video', (req, res) => {
  console.log('Video export request received at /api/export-video');
  console.log('Request body length:', req.body ? JSON.stringify(req.body).length : 0);
  
  if (req.body) {
    console.log('Project Duration:', req.body.projectDuration);
    console.log('Number of Tracks:', req.body.tracks ? req.body.tracks.length : 0);
    if (req.body.tracks && req.body.tracks.length > 0) {
        console.log('First track type:', req.body.tracks[0].type);
        console.log('Number of clips in first track:', req.body.tracks[0].clips ? req.body.tracks[0].clips.length : 0);
    }
    console.log('Number of Media Files in Library (summary):', req.body.mediaLibrary ? req.body.mediaLibrary.length : 0);
  }
  
  res.status(200).json({ 
    success: true, 
    message: 'Video export request received by server. Actual video processing logic (e.g., using FFmpeg) needs to be implemented here.',
    details: 'This endpoint is a placeholder. It received project data but did not process it into a video file.',
    data_summary: {
        projectDuration: req.body.projectDuration,
        numTracks: req.body.tracks ? req.body.tracks.length : 0,
        numMediaFiles: req.body.mediaLibrary ? req.body.mediaLibrary.length : 0,
    }
  });
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke on the server!');
});

app.listen(PORT, () => {
  console.log(`Node.js server listening on port ${PORT}`);
  console.log(`Video export endpoint available at http://localhost:${PORT}/api/export-video`);
});

