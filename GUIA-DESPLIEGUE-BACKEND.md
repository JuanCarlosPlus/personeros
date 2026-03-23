# Guia de Despliegue - Sistema de Personeros 2026
**Fecha:** 22 de marzo de 2026
**Version:** 1.0 (commit aff3abf)

---

## 1. Descripcion del Sistema

Aplicacion web para gestion de personeros electorales. Incluye:
- **Backend:** API REST con Node.js 20 + Express + MongoDB
- **Frontend:** React (ya compilado en `client/dist/`)
- El backend sirve el frontend como archivos estaticos en modo produccion

**La aplicacion es un solo proceso** que atiende tanto la API como la interfaz web.

---

## 2. Requisitos del Servidor

| Requisito | Minimo |
|-----------|--------|
| Sistema Operativo | Ubuntu 22.04+ / Debian 12+ / CentOS 9+ |
| RAM | 1 GB |
| Disco | 5 GB libres |
| Software | Docker + Docker Compose |
| Puertos | 5001 (app) - configurable |
| Acceso | SSH con permisos root o sudo |

---

## 3. Estructura de Archivos

```
personeros/
├── Dockerfile              ← Receta de construccion
├── docker-compose.yml      ← Orquestador (app + MongoDB)
├── .dockerignore           ← Exclusiones del build
├── .env                    ← CREAR con las variables (ver paso 5)
├── server/
│   ├── package.json
│   ├── .env.example        ← Plantilla de variables
│   └── src/                ← Codigo del servidor
└── client/
    ├── package.json
    ├── src/                ← Codigo del frontend (React)
    └── public/             ← Archivos estaticos
```

---

## 4. Instalacion de Docker (si no esta instalado)

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Agregar usuario actual al grupo docker
sudo usermod -aG docker $USER

# IMPORTANTE: Cerrar sesion SSH y volver a entrar

# Verificar instalacion
docker --version          # Debe mostrar 24.x o superior
docker compose version    # Debe mostrar 2.x o superior
```

---

## 5. Configuracion del .env

**Copiar la plantilla y editar:**

```bash
cp server/.env.example .env
nano .env
```

**Contenido del .env (completar los valores marcados):**

```env
NODE_ENV=production
PORT=5001
MONGO_URI=mongodb://mongo:27017/personeros_db
JWT_SECRET=<GENERAR_CLAVE_SEGURA>
JWT_EXPIRES_IN=7d
FACTILIZA_TOKEN=<TOKEN_PROPORCIONADO_POR_EL_CLIENTE>
```

**Para generar JWT_SECRET (ejecutar en terminal):**

```bash
openssl rand -hex 48
```

Copiar el resultado y pegarlo como valor de JWT_SECRET.

> **IMPORTANTE:** El valor de `MONGO_URI` debe ser exactamente `mongodb://mongo:27017/personeros_db` porque `mongo` es el nombre del contenedor de MongoDB definido en docker-compose.yml. NO usar `localhost` ni `127.0.0.1`.

> **IMPORTANTE:** El `FACTILIZA_TOKEN` sera proporcionado por el cliente. Sin este token, la consulta de DNI no funcionara.

---

## 6. Despliegue

### 6.1 Subir archivos al servidor

Copiar toda la carpeta `personeros/` al servidor via SCP, SFTP o git clone:

```bash
# Opcion A: Desde GitHub
git clone https://github.com/JuanCarlosPlus/personeros.git
cd personeros

# Opcion B: Via SCP (desde tu maquina local)
scp -r personeros/ usuario@IP_SERVIDOR:/ruta/destino/
```

### 6.2 Construir y levantar

```bash
cd personeros

# Crear el .env (ver paso 5)
cp server/.env.example .env
nano .env

# Levantar todo (primera vez tarda 2-3 minutos)
docker compose up -d --build
```

### 6.3 Verificar que esta corriendo

```bash
# Ver estado de los contenedores
docker compose ps

# Resultado esperado:
# NAME               STATUS
# personeros-app     Up
# personeros-mongo   Up

# Probar la API
curl http://localhost:5001/api/health
# Resultado esperado: {"status":"ok","ts":"2026-03-22T..."}
```

### 6.4 Crear el usuario administrador inicial

La primera vez necesita crearse un usuario admin en la base de datos:

```bash
docker exec -it personeros-app node -e "
import mongoose from 'mongoose';
import User from './src/models/User.js';
import { config } from './src/config/env.js';

await mongoose.connect(config.mongoUri);
const exists = await User.findOne({ username: 'admin' });
if (!exists) {
  await User.create({
    username: 'admin',
    password: 'admin123',
    nombre: 'Administrador',
    isAdmin: true,
    active: true
  });
  console.log('Usuario admin creado: admin / admin123');
} else {
  console.log('Usuario admin ya existe');
}
process.exit(0);
"
```

> **IMPORTANTE:** Cambiar la contraseña `admin123` por una segura desde la aplicacion despues del primer login.

---

## 7. Acceso a la Aplicacion

| URL | Descripcion |
|-----|-------------|
| `http://IP_SERVIDOR:5001` | Pantalla principal (login admin) |
| `http://IP_SERVIDOR:5001/directivo/login` | Login para directivos |
| `http://IP_SERVIDOR:5001/personero/login` | Login para personeros |
| `http://IP_SERVIDOR:5001/jefe-local/login` | Login para jefes de local |
| `http://IP_SERVIDOR:5001/api/health` | Health check de la API |
| `http://IP_SERVIDOR:5001/manual-usuario-v2.html` | Manual de usuario interactivo |

---

## 8. Configurar Dominio con HTTPS (Opcional pero Recomendado)

Si se va a acceder desde internet con un dominio:

### 8.1 Instalar Nginx

```bash
sudo apt install nginx -y
```

### 8.2 Crear configuracion del sitio

```bash
sudo nano /etc/nginx/sites-available/personeros
```

Contenido:

```nginx
server {
    listen 80;
    server_name personeros.dominiodel partido.pe;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8.3 Activar sitio y reiniciar

```bash
sudo ln -s /etc/nginx/sites-available/personeros /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8.4 Certificado SSL gratuito (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d personeros.dominiodelpartido.pe
```

El certificado se renueva automaticamente cada 90 dias.

---

## 9. Comandos de Operacion

### Ver logs en tiempo real
```bash
docker compose logs -f app
```

### Reiniciar la aplicacion
```bash
docker compose restart app
```

### Detener todo
```bash
docker compose down
```

### Actualizar a nueva version
```bash
cd personeros
git pull origin master       # o reemplazar archivos manualmente
docker compose down
docker compose up -d --build
```

> **La base de datos NO se pierde** al actualizar. Los datos estan en un volumen Docker persistente.

### Backup de la base de datos
```bash
# Crear backup
docker exec personeros-mongo mongodump --db personeros_db --archive=/tmp/backup.gz --gzip
docker cp personeros-mongo:/tmp/backup.gz ./backup-$(date +%Y%m%d).gz

# Restaurar backup
docker cp backup-20260322.gz personeros-mongo:/tmp/backup.gz
docker exec personeros-mongo mongorestore --db personeros_db --archive=/tmp/backup.gz --gzip --drop
```

---

## 10. Troubleshooting

| Problema | Causa probable | Solucion |
|----------|---------------|----------|
| `port 5001 already in use` | Otro servicio usa ese puerto | Cambiar PORT en .env o liberar el puerto |
| App no conecta a MongoDB | MONGO_URI incorrecto | Verificar que dice `mongodb://mongo:27017/...` (NO localhost) |
| `Cannot find module` | Build incompleto | `docker compose down && docker compose up -d --build` |
| Pantalla en blanco | Frontend no compilado | Reconstruir: `docker compose build --no-cache` |
| DNI no consulta | Token Factiliza invalido | Verificar FACTILIZA_TOKEN en .env |
| Error 502 desde nginx | App no esta corriendo | `docker compose ps` y verificar que `personeros-app` este Up |
| Se lleno el disco | Imagenes Docker acumuladas | `docker system prune -a` |

### Ver errores especificos
```bash
# Logs del servidor
docker compose logs app --tail 50

# Entrar al contenedor para debug
docker exec -it personeros-app sh

# Consultar MongoDB directamente
docker exec -it personeros-mongo mongosh personeros_db
```

---

## 11. Contacto

Para soporte tecnico o dudas sobre la configuracion, contactar al desarrollador.

**No modificar** los archivos dentro de `server/src/` sin autorizacion.
