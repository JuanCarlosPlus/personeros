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
import cargoRoutes from './routes/cargos.js';
import directivoRoutes from './routes/directivos.js';
import invitacionRoutes from './routes/invitaciones.js';
import whatsappRoutes from './routes/whatsapp.js';
import jefeLocalRoutes from './routes/jefeLocal.js';
import reporteRoutes from './routes/reportes.js';
import chatRoutes from './routes/chat.js';
import './models/Ubicacion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: config.corsOrigin || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Health
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/coverage', coverageRoutes);
app.use('/api/v1/personeros', personeroRoutes);
app.use('/api/v1/coordinadores', coordinadorRoutes);
app.use('/api/v1/cargos', cargoRoutes);
app.use('/api/v1/directivos', directivoRoutes);
app.use('/api/v1/invitaciones', invitacionRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/jefe-local', jefeLocalRoutes);
app.use('/api/v1/reportes', reporteRoutes);
app.use('/api/v1/chat', chatRoutes);

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
