import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApiRouter } from './server/routes/api.js';
import { initializeStore } from './server/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function startServer() {
  initializeStore();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Mount ResumeIQ API routes under /api
  app.use('/api', createApiRouter());

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Ensure SPA fallback renders frontend/index.html if Vite middleware passes through
    app.use('*', async (req, res, next) => {
      try {
        const indexPath = path.resolve(__dirname, 'frontend', 'index.html');
        let html = fs.readFileSync(indexPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`ResumeIQ server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ResumeIQ server:', err);
  process.exit(1);
});
