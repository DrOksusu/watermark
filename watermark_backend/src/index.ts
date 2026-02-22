import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
// v2 staging branch

// Load environment variables FIRST before importing other modules
dotenv.config();

import routes from './routes';
import { USE_S3 } from './config/multer';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://watermark-steel.vercel.app',
  'https://watermark.koco.me',
  'http://watermark.koco.me',
  FRONTEND_URL,
].filter((origin, index, self) => self.indexOf(origin) === index); // Remove duplicates

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads with CORS headers for cross-origin image loading
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     Watermark Backend Server Started       ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}                               ║
║  Environment: ${process.env.NODE_ENV || 'development'}               ║
║  Storage: ${USE_S3 ? 'AWS S3' : 'Local Disk'}                    ║
║  S3 Bucket: ${process.env.AWS_S3_BUCKET || 'N/A'}              ║
║  Allowed Origins: ${allowedOrigins.length} configured       ║
╚════════════════════════════════════════════╝
  `);
});

export default app;
