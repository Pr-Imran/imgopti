import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to proxy the image fetch and handle CORS securely
  app.get('/api/fetch-image', async (req, res) => {
    try {
      const url = req.query.url;
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'Missing a valid URL parameter' });
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        res.status(response.status).json({ error: `Failed to fetch from URL: ${response.statusText}` });
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      // Attach highly permissive headers so client Canvas is not tainted
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Optional cache
      
      res.send(buffer);
    } catch (error) {
      console.error('Error fetching image proxy:', error);
      res.status(500).json({ error: 'Failed to proxy the image fetch. Check if the URL is valid and reachable.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
