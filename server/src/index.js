import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import coverageRoutes from './routes/coverage.js';
import personeroRoutes from './routes/personeros.js';
import coordinadorRoutes from './routes/coordinadores.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: config.nodeEnv === 'production'
    ? true
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
}));

// Health
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/coverage', coverageRoutes);
app.use('/api/v1/personeros', personeroRoutes);
app.use('/api/v1/coordinadores', coordinadorRoutes);

// Static in production
if (config.nodeEnv === 'production') {
  const clientDist = resolve(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(resolve(clientDist, 'index.html'));
    }
  });
}

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`🚀 Server on port ${config.port} [${config.nodeEnv}]`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});

export default app;
