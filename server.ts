import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './src/backend/routes/authRoutes.ts';
import { feesRouter } from './src/backend/routes/feesRoutes.ts';
import { attendanceRouter } from './src/backend/routes/attendanceRoutes.ts';
import { testsRouter } from './src/backend/routes/testsRoutes.ts';
import { bkashRouter } from './src/backend/routes/bkashRoutes.ts';
import { parentRouter } from './src/backend/routes/parentRoutes.ts';
import { ownerRouter } from './src/backend/routes/ownerRoutes.ts';
import { adminRouter } from './src/backend/routes/adminRoutes.ts';
import { qaRouter } from './src/backend/routes/qaRoutes.ts';
import { exportRouter } from './src/backend/routes/exportRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Uploads directory
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Mount API routers
  app.use('/api/auth', authRouter);
  app.use('/api/fees', feesRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/tests', testsRouter);
  app.use('/api/bkash', bkashRouter);
  app.use('/api/parent', parentRouter);
  app.use('/api/owner', ownerRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/qa', qaRouter);
  app.use('/api/export', exportRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Vite integration:
  // In development, mount Vite dev server middlewares to serve frontend assets with HMR/bundling.
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Tuition Management BD Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
