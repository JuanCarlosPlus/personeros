#!/bin/bash
# deploy.sh — Actualizar personeros en el VPS
# Uso: bash deploy.sh
# Requiere: plink y pscp (PuTTY) en el PATH

VPS="root@192.64.87.241"
PASS="ECry4TlR71mqo"
PLINK="/c/Program Files/PuTTY/plink"

echo "🚀 Desplegando personeros en el VPS..."

"$PLINK" -ssh $VPS -pw "$PASS" -batch "
  set -e
  cd /root/personeros

  echo '📥 Actualizando código...'
  git pull

  echo '📦 Instalando dependencias...'
  cd server && npm install --omit=dev
  cd ../client && npm install

  echo '🔨 Compilando frontend...'
  npm run build

  echo '📂 Publicando archivos estáticos...'
  cp -r dist/* /var/www/personeros/
  chmod -R 755 /var/www/personeros

  echo '🔄 Reiniciando servidor...'
  cd /root/personeros/server
  pm2 restart personeros --update-env

  echo '✅ Deploy completado!'
  pm2 list
"

echo ""
echo "🌐 URL: http://192.64.87.241:3000"
