console.log('[redbook] booting...');
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
try {
  const { config } = await import('dotenv');
  config();
} catch {}

import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import topicRoutes from './routes/topics.js';
import favoriteRoutes from './routes/favorites.js';
import planRoutes from './routes/plan.js';
import aiRoutes from './routes/ai.js';
import analyzeRoutes from './routes/analyze.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const frontendUrl = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: frontendUrl === '*' ? true : frontendUrl.split(',') }));
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files
app.use(express.static(__dirname));

app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();

    // 检测 ffmpeg 可用性（日志输出，不影响启动）
    try {
      const { checkFfmpeg, ensureFfmpegPaths } = await import('./utils/videoProcessor.js');
      await ensureFfmpegPaths();
      const hasFfmpeg = checkFfmpeg();
      console.log('ffmpeg 可用:', hasFfmpeg, hasFfmpeg ? '✓ 视频关键帧提取已启用' : '（视频分析将仅使用文本模式）');
    } catch {}

    // Production: listen on 0.0.0.0
    const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log('PID:', process.pid);
    });

    server.on('error', (err) => {
      console.error('Server error:', err.message);
    });

    setInterval(() => {}, 1000);

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err.message);
      console.error(err.stack);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
