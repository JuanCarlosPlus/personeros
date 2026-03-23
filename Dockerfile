# ============================================
# Dockerfile - Sistema de Personeros 2026
# ============================================
# Este archivo crea una "caja" con todo lo necesario
# para que la aplicación funcione en cualquier servidor.

# Paso 1: Compilar el frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Paso 2: Preparar el servidor
FROM node:20-alpine
WORKDIR /app

# Copiar solo lo del servidor
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copiar código del servidor
COPY server/src/ ./src/

# Copiar el frontend compilado
COPY --from=frontend-build /app/client/dist/ ../client/dist/

# Puerto por defecto
EXPOSE 5001

# Variables de entorno por defecto (se sobreescriben con .env o docker-compose)
ENV NODE_ENV=production
ENV PORT=5001

# Arrancar el servidor
CMD ["node", "src/index.js"]
