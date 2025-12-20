# Guía de Despliegue en Render

Esta guía te ayudará a desplegar Crypto ERP en Render con todos los servicios necesarios.

---

## Requisitos Previos

1. Cuenta en [Render](https://render.com)
2. Repositorio de GitHub conectado a Render
3. Cuenta en [Upstash](https://upstash.com) para Redis (gratis)

---

## Paso 1: Crear Redis en Upstash

Render no tiene Redis nativo en el plan gratuito, así que usaremos Upstash:

1. Ve a [upstash.com](https://upstash.com)
2. Crea una cuenta o inicia sesión
3. Click en "Create Database"
4. Selecciona:
   - **Type**: Redis
   - **Name**: crypto-erp-redis
   - **Region**: Europe (Frankfurt) - para minimizar latencia
   - **Price**: Free
5. Click "Create"
6. Guarda estos valores (los necesitarás después):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - O usa la conexión TCP:
     - `REDIS_HOST`
     - `REDIS_PORT`
     - `REDIS_PASSWORD`

---

## Paso 2: Crear Base de Datos PostgreSQL en Render

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Click en "New +" → "PostgreSQL"
3. Configura:
   - **Name**: crypto-erp-db
   - **Database**: crypto_erp
   - **User**: crypto_erp_user
   - **Region**: Frankfurt (EU Central)
   - **Plan**: Starter ($7/mes) o Free ($0/mes - se elimina después de 90 días)
4. Click "Create Database"
5. Espera a que se aprovisione (2-3 minutos)

### Habilitar TimescaleDB (Opcional pero Recomendado)

Si usas el plan Starter o superior:

```bash
# Conectar a la base de datos usando la URL interna
psql [INTERNAL_DATABASE_URL]

# Crear extensión TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

# Verificar
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';

# Salir
\q
```

**Nota**: El plan Free de Render NO soporta extensiones de PostgreSQL. Si necesitas TimescaleDB, usa el plan Starter.

---

## Paso 3: Desplegar con Blueprint

### Opción A: Despliegue Automático desde GitHub

1. Haz commit y push del `render.yaml` actualizado:
   ```bash
   git add render.yaml docs/RENDER-DEPLOYMENT.md
   git commit -m "docs: Add Render deployment configuration"
   git push
   ```

2. Ve a [dashboard.render.com](https://dashboard.render.com)
3. Click en "New +" → "Blueprint"
4. Conecta tu repositorio de GitHub
5. Selecciona el repositorio `crypto-erp`
6. Render detectará automáticamente el `render.yaml`
7. Revisa los servicios que se van a crear:
   - crypto-erp-api (Web Service)
   - crypto-erp-worker (Background Worker)
   - crypto-erp-web (Static Site)
   - crypto-erp-db (PostgreSQL)
8. Click "Apply"

### Opción B: Despliegue Manual

Si prefieres crear los servicios manualmente:

#### 1. API Service

1. New + → Web Service
2. Conecta tu repo de GitHub
3. Configura:
   - **Name**: crypto-erp-api
   - **Region**: Frankfurt
   - **Branch**: main
   - **Root Directory**: (vacío)
   - **Build Command**: `npm ci && npm run build:api`
   - **Start Command**: `npm run start:api:prod`
   - **Plan**: Starter
4. Environment Variables (ver sección de Variables de Entorno abajo)
5. Click "Create Web Service"

#### 2. Worker Service

1. New + → Background Worker
2. Mismo repo de GitHub
3. Configura:
   - **Name**: crypto-erp-worker
   - **Build Command**: `npm ci && npm run build:worker`
   - **Start Command**: `npm run start:worker:prod`
4. Environment Variables (solo las del worker)
5. Click "Create"

#### 3. Frontend (Static Site)

1. New + → Static Site
2. Mismo repo
3. Configura:
   - **Name**: crypto-erp-web
   - **Build Command**: `npm ci && npm run build:web`
   - **Publish Directory**: `apps/web/dist/web/browser`
4. Click "Create Static Site"

---

## Paso 4: Configurar Variables de Entorno

### API Service - Variables de Entorno

Ve a tu servicio `crypto-erp-api` → Environment → Add Environment Variable:

```bash
# Required
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database (desde crypto-erp-db)
DATABASE_URL=[AUTO - from Database]
DATABASE_PRIMARY_REGION=eu

# Redis (desde Upstash)
REDIS_HOST=<tu-upstash-host>
REDIS_PORT=<tu-upstash-port>
REDIS_PASSWORD=<tu-upstash-password>
REDIS_DB=0

# JWT (Render auto-generará valores seguros)
JWT_SECRET=[Generate Value]
JWT_REFRESH_SECRET=[Generate Value]
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Encryption
ENCRYPTION_KEY=[Generate Value]

# CORS
CORS_ORIGINS=https://crypto-erp-web.onrender.com,https://tudominio.com

# Optional: AI
OPENAI_API_KEY=<tu-api-key>
ANTHROPIC_API_KEY=<tu-api-key>

# Optional: Blockchain
COVALENT_API_KEY=<tu-api-key>

# Optional: QuickBooks
QUICKBOOKS_CLIENT_ID=<tu-client-id>
QUICKBOOKS_CLIENT_SECRET=<tu-client-secret>

# Optional: Xero
XERO_CLIENT_ID=<tu-client-id>
XERO_CLIENT_SECRET=<tu-client-secret>
```

### Worker Service - Variables de Entorno

```bash
NODE_ENV=production
DATABASE_URL=[same as API]
REDIS_HOST=[same as API]
REDIS_PORT=[same as API]
REDIS_PASSWORD=[same as API]
REDIS_DB=0
COVALENT_API_KEY=<tu-api-key>
```

---

## Paso 5: Ejecutar Migraciones de Base de Datos

Una vez que la base de datos esté creada y la API desplegada:

### Opción A: Desde Render Shell

1. Ve a crypto-erp-api → Shell
2. Ejecuta Prisma migrations:

```bash
# Generar cliente Prisma
npx prisma generate --schema=libs/database/prisma/schema.prisma

# Push schema a la base de datos
npx prisma db push --schema=libs/database/prisma/schema.prisma
```

### Opción B: Desde tu máquina local

```bash
# Conectar a la base de datos de Render
export DATABASE_URL="postgresql://crypto_erp_user:password@host/crypto_erp"

# Ejecutar migrations
npm run db:push
```

### Ejecutar Migraciones SQL Personalizadas

Si habilitaste TimescaleDB, ejecuta las migraciones custom:

```bash
# Conectar vía psql
psql $DATABASE_URL

# Ejecutar migrations
\i libs/database/prisma/migrations/20251220_analytics_timescaledb.sql
\i libs/database/prisma/migrations/20251220_oauth_marketplace.sql
\i libs/database/prisma/migrations/20251220_integrations.sql
\i libs/database/prisma/migrations/20251220_add_company_region.sql

# Verificar
\dt
\q
```

---

## Paso 6: Configurar Dominio Personalizado (Opcional)

### Para el API

1. Ve a crypto-erp-api → Settings → Custom Domain
2. Agrega tu dominio: `api.tudominio.com`
3. Configura DNS:
   - **Type**: CNAME
   - **Name**: api
   - **Value**: crypto-erp-api.onrender.com

### Para el Frontend

1. Ve a crypto-erp-web → Settings → Custom Domain
2. Agrega tu dominio: `app.tudominio.com` o `tudominio.com`
3. Configura DNS:
   - **Type**: CNAME
   - **Name**: app (o @)
   - **Value**: crypto-erp-web.onrender.com

### Actualizar CORS

Después de configurar el dominio, actualiza `CORS_ORIGINS` en la API:

```
CORS_ORIGINS=https://app.tudominio.com,https://tudominio.com
```

---

## Paso 7: Verificar Despliegue

### Verificar API

Abre en tu navegador:
```
https://crypto-erp-api.onrender.com/api/v1/health/liveness
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2025-12-20T10:00:00.000Z",
  "uptime": 12345
}
```

### Verificar Frontend

Abre:
```
https://crypto-erp-web.onrender.com
```

Deberías ver la página de login de Crypto ERP.

### Verificar Worker

Ve a crypto-erp-worker → Logs

Deberías ver:
```
[Nest] INFO [NestApplication] Nest application successfully started
[BullMQ] Connected to Redis
[Worker] Listening for jobs...
```

---

## Problemas Comunes

### 1. Error: "Cannot find module '@crypto-erp/database'"

**Solución**: Asegúrate de que el build command incluya el workspace:

```bash
npm ci && npm run build:api
```

### 2. Error: "ECONNREFUSED" al conectar a Redis

**Causa**: Variables de Redis incorrectas

**Solución**:
- Verifica `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Asegúrate de usar los valores de Upstash
- Verifica que el formato sea correcto (sin `redis://` prefix)

### 3. Error: "relation 'companies' does not exist"

**Causa**: Migraciones no ejecutadas

**Solución**:
```bash
# Desde Render Shell
npx prisma db push --schema=libs/database/prisma/schema.prisma
```

### 4. Frontend muestra página en blanco

**Causa**: Ruta del build incorrecta o CORS

**Solución**:
- Verifica que `staticPublishPath` sea: `apps/web/dist/web/browser`
- Verifica CORS_ORIGINS en la API
- Revisa logs del navegador (F12)

### 5. Worker no procesa jobs

**Causa**: No conecta a Redis

**Solución**:
- Verifica que Worker tenga las mismas variables de Redis que API
- Verifica logs del Worker para ver el error exacto

---

## Monitoreo y Logs

### Ver Logs

**API**:
```
crypto-erp-api → Logs (en tiempo real)
```

**Worker**:
```
crypto-erp-worker → Logs
```

### Métricas

Render proporciona métricas automáticas:
- CPU usage
- Memory usage
- Request count
- Response time

Ve a cada servicio → Metrics

---

## Costos Estimados

### Plan Gratuito
- PostgreSQL Free: $0 (se elimina después de 90 días)
- Web Service Free: $0 (750 horas/mes)
- Upstash Redis: $0 (gratis permanente con límites)
- **Total**: $0/mes

### Plan Starter (Recomendado para producción)
- PostgreSQL Starter: $7/mes
- Web Service Starter (API): $7/mes
- Background Worker Starter: $7/mes
- Static Site: $0 (gratis)
- Upstash Redis Pro: $10/mes (opcional)
- **Total**: ~$21-31/mes

---

## Escalado

### Vertical (Más recursos)

Cambia el plan:
- Starter → Standard → Pro

### Horizontal (Más instancias)

1. Ve a servicio → Settings → Scaling
2. Aumenta "Instance Count"
3. Render balanceará automáticamente la carga

---

## Respaldo y Recuperación

### PostgreSQL

Render hace backups automáticos:
- **Free**: No backups
- **Starter**: 7 días de backups
- **Standard**: 14 días
- **Pro**: 30 días

Para restaurar:
1. Ve a Database → Backups
2. Selecciona backup
3. Click "Restore"

### Variables de Entorno

Exporta tus variables regularmente:
1. Ve a servicio → Environment
2. Click "Download .env"

---

## Siguiente Paso: Configurar Integraciones

Una vez desplegado, configura las integraciones:

1. **QuickBooks**: Registra tu app en [developer.intuit.com](https://developer.intuit.com)
2. **Xero**: Registra tu app en [developer.xero.com](https://developer.xero.com)
3. Agrega las credenciales a las variables de entorno
4. Prueba el flujo OAuth desde la UI

---

**Última Actualización**: 20 de Diciembre 2025
**Estado**: Phase 4B Complete
