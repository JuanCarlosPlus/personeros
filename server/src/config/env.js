import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 5001,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/personeros_db',
  jwtSecret: process.env.JWT_SECRET || 'personeros_jwt_secret_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  factilizaToken: process.env.FACTILIZA_TOKEN || '',
};
