# Instrucciones de Despliegue con Docker
# Sistema de Personeros 2026
# ============================================

## Requisitos del servidor
- Linux (Ubuntu 22+ recomendado) o Windows Server
- Docker instalado (https://docs.docker.com/engine/install/)
- Docker Compose instalado (viene incluido con Docker Desktop)
- Minimo 1GB RAM, 10GB disco

## Paso 1: Instalar Docker (si no lo tiene)

### Ubuntu/Debian:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Cerrar sesion y volver a entrar
```

### Verificar instalacion:
```bash
docker --version
docker compose version
```

## Paso 2: Subir los archivos al servidor

Copiar TODA la carpeta del proyecto al servidor. Debe contener:
```
personeros/
  Dockerfile
  docker-compose.yml
  .env              <-- IMPORTANTE: configurar antes
  .dockerignore
  server/
    package.json
    src/
  client/
    package.json
    src/
    public/
```

## Paso 3: Configurar el .env

Editar el archivo `.env` en la raiz del proyecto:

```bash
nano .env
```

Campos importantes:
```
JWT_SECRET=CAMBIAR_POR_UNA_CLAVE_MUY_LARGA_Y_SEGURA
FACTILIZA_TOKEN=el_token_de_factiliza
```

Para generar una clave JWT segura:
```bash
openssl rand -hex 48
```

## Paso 4: Levantar todo

```bash
cd personeros
docker compose up -d
```

Esto hace TODO automaticamente:
1. Descarga Node.js 20 y MongoDB 7
2. Instala las dependencias del frontend y backend
3. Compila el frontend (React -> HTML/CSS/JS)
4. Arranca MongoDB en un contenedor
5. Arranca la aplicacion en otro contenedor
6. Conecta todo en una red interna

La primera vez tarda 2-3 minutos. Las siguientes veces son instantaneas.

## Paso 5: Verificar

```bash
# Ver que los contenedores estan corriendo
docker compose ps

# Debe mostrar:
# personeros-app    ... Up
# personeros-mongo  ... Up

# Probar la API
curl http://localhost:5001/api/health

# Debe responder: {"status":"ok","ts":"..."}
```

La aplicacion estara disponible en: http://IP_DEL_SERVIDOR:5001

## Comandos utiles

```bash
# Ver logs en tiempo real
docker compose logs -f app

# Reiniciar la aplicacion (despues de una actualizacion)
docker compose down
docker compose up -d --build

# Solo reiniciar la app (sin reconstruir)
docker compose restart app

# Detener todo
docker compose down

# Detener todo Y borrar la base de datos (CUIDADO!)
docker compose down -v

# Ver cuanto espacio usa
docker system df

# Entrar al contenedor de MongoDB para consultas manuales
docker exec -it personeros-mongo mongosh personeros_db
```

## Actualizar la aplicacion

Cuando haya una nueva version:

```bash
cd personeros
# Reemplazar los archivos actualizados
docker compose down
docker compose up -d --build
```

La base de datos NO se pierde al actualizar. Los datos estan en un volumen persistente.

## Exponer al publico (con dominio)

Si quiere acceder desde internet con un dominio (ej: personeros.mipartido.pe):

### Opcion 1: Nginx como proxy (recomendado)

Instalar nginx en el servidor:
```bash
apt install nginx
```

Crear archivo `/etc/nginx/sites-available/personeros`:
```nginx
server {
    listen 80;
    server_name personeros.mipartido.pe;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Activar y reiniciar:
```bash
ln -s /etc/nginx/sites-available/personeros /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Opcion 2: HTTPS con Let's Encrypt (gratis)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d personeros.mipartido.pe
```

Esto agrega SSL automaticamente y renueva cada 90 dias.

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| "port 5001 already in use" | Cambiar PORT en .env o detener lo que use ese puerto |
| La app no conecta a MongoDB | Verificar que `personeros-mongo` este corriendo con `docker compose ps` |
| Error al construir | Ejecutar `docker compose build --no-cache` |
| Se acabo el disco | `docker system prune -a` (borra imagenes no usadas) |
| Olvidé la clave admin | Entrar a MongoDB: `docker exec -it personeros-mongo mongosh personeros_db` y actualizar el usuario |
