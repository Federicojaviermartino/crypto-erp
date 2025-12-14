# Changelog

All notable changes to Crypto-ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2025-01-08 - Commercial Launch Ready 🎉

### 🚀 Fase 3B: Commercial Launch

Esta versión marca la **Commercial Launch Readiness** de Crypto-ERP, con todas las funcionalidades críticas para operar como producto SaaS comercial.

#### Added - Compliance Fiscal

- **Modelo 347 (Declaración Anual de Operaciones)**:
  - ✅ Detección automática de operaciones >€3,005.01
  - ✅ Agregación anual por contacto con desglose trimestral
  - ✅ Generación XML formato oficial AEAT
  - ✅ Validación de NIFs españoles
  - ✅ Endpoints: `/fiscal/modelo347/calculate`, `/fiscal/modelo347/xml`
  - 📄 Archivos: `apps/api/src/modules/fiscal/modelo347.service.ts`

- **SII (Suministro Inmediato de Información)**:
  - ✅ Envío automático facturas emitidas (plazo 4 días desde emisión)
  - ✅ Envío automático facturas recibidas
  - ✅ Generación XML SOAP formato SII oficial
  - ✅ Integración con AEAT SOAP client (reutiliza infraestructura Verifactu)
  - ✅ Tracking completo de estado: PENDING → SENT → ACCEPTED/REJECTED
  - ✅ Detección automática de facturas pendientes de envío
  - ✅ Endpoints: `/fiscal/sii/submit-issued`, `/fiscal/sii/submit-received`, `/fiscal/sii/pending`
  - 📄 Archivos: `apps/api/src/modules/fiscal/sii.service.ts`

#### Added - Payments & SaaS

- **Stripe Integration Completa**:
  - ✅ Checkout Sessions con trial de 14 días
  - ✅ Customer management automático
  - ✅ Webhook handling para 9 eventos de Stripe
  - ✅ Customer Portal para gestión de subscripciones
  - ✅ Sync automático de estado de subscripciones
  - ✅ Registro completo de payments en base de datos
  - ✅ Endpoints: `/payments/checkout`, `/payments/portal`, `/payments/cancel`, `/payments/reactivate`, `/payments/webhook`
  - 📄 Archivos: `apps/api/src/modules/payments/stripe.service.ts`, `payments.controller.ts`

- **Subscription Tiers (SaaS Model)**:
  - ✅ 3 planes configurados: **Free** (€0), **Pro** (€29/mes), **Enterprise** (€99/mes)
  - ✅ Usage limits enforcement por plan (invoices/mes, AI messages/mes)
  - ✅ Feature flags por subscripción (Verifactu, SII, AI OCR, multi-user, etc.)
  - ✅ Contadores de uso mensual con reset automático (día 1 de cada mes)
  - ✅ Guards para enforcar límites: `enforceInvoiceLimit()`, `enforceAiMessageLimit()`
  - ✅ Endpoints: `/payments/plans`, `/payments/subscription`, `/payments/usage`
  - 📄 Archivos: `apps/api/src/modules/payments/subscriptions.service.ts`

#### Added - Monitoring & Observability

- **Prometheus Metrics**:
  - ✅ 15+ métricas personalizadas implementadas
  - ✅ HTTP metrics: request rate, duration, error rate
  - ✅ Database metrics: query duration, connection pool
  - ✅ Queue metrics: active jobs, completion rate, failures
  - ✅ Business metrics: invoices created, subscriptions active, revenue (MRR), churn
  - ✅ Backup metrics: last success timestamp, duration, size, success rate
  - ✅ Auto-tracking via interceptor global
  - ✅ Endpoint: `/metrics` (Prometheus format)
  - 📄 Archivos: `apps/api/src/modules/monitoring/metrics.service.ts`, `metrics.interceptor.ts`

- **Grafana Dashboards**:
  - ✅ 16 paneles pre-configurados
  - ✅ Paneles: API request rate, response time p95, error rate, DB query duration, queue status, subscriptions, revenue, backups
  - ✅ Thresholds configurados (green/yellow/red)
  - ✅ Acceso: http://localhost:3100 (admin/admin)
  - 📄 Archivos: `monitoring/grafana-dashboard.json`

- **Prometheus Alerts**:
  - ✅ 18 reglas de alerta configuradas
  - ✅ Alertas críticas: API down, backup failed, backup not run, database issues
  - ✅ Alertas warning: slow response, high error rate, queue backlog, backup anomalies
  - ✅ Alertas info: business metrics (no invoices created, high churn)
  - 📄 Archivos: `monitoring/alert.rules.yml`

- **Monitoring Stack Docker**:
  - ✅ Prometheus (scraping + alerting)
  - ✅ Grafana (dashboards + visualization)
  - ✅ Pushgateway (métricas de backups)
  - ✅ Exporters: postgres-exporter, redis-exporter, node-exporter
  - 📄 Archivos: `docker-compose.monitoring.yml`, `monitoring/prometheus.yml`

#### Added - Automated Backups

- **PostgreSQL Backup Automation**:
  - ✅ Backup scheduler con cron (default: 2 AM diario)
  - ✅ Compresión automática con gzip
  - ✅ Verificación de integridad post-backup
  - ✅ Upload automático a AWS S3 (opcional)
  - ✅ Política de retención configurable:
    - Daily backups: 7 días
    - Weekly backups: 4 semanas (domingos)
    - Monthly backups: 12 meses (día 1)
  - ✅ Notificaciones vía webhook (Slack/Discord compatible)
  - ✅ Métricas enviadas a Prometheus Pushgateway
  - 📄 Archivos: `scripts/backup-database.sh`

- **Safe Database Restoration**:
  - ✅ Safety backup automático antes de restaurar
  - ✅ Confirmación manual requerida (escribir "yes")
  - ✅ Verificación de integridad pre-restauración
  - ✅ Download automático desde S3 con flag `--from-s3`
  - ✅ Recreación automática de extensiones (uuid-ossp, vector)
  - ✅ Verificación post-restauración (conteo de tablas)
  - 📄 Archivos: `scripts/restore-database.sh`

- **Backup Docker Service**:
  - ✅ Container dedicado con cron daemon
  - ✅ Health checks configurados
  - ✅ Environment-based configuration
  - ✅ Logs estructurados (último 30 backups)
  - ✅ Integración completa con monitoring stack
  - 📄 Archivos: `docker-compose.backups.yml`, `scripts/Dockerfile.backup`, `scripts/backup-entrypoint.sh`

#### Added - Documentation

- ✅ **DEPLOYMENT.md** (500+ líneas): Guía completa de deployment a producción
  - Prerequisites & server requirements
  - Architecture diagrams
  - Step-by-step deployment
  - Monitoring setup
  - Backup & recovery procedures
  - Security hardening
  - Troubleshooting guide

- ✅ **SCALING.md** (400+ líneas): Guía de escalado 10 → 10,000+ usuarios
  - Scaling roadmap por fases
  - Architecture evolution
  - Horizontal scaling (API, Workers, DB)
  - Database optimization (replicas, sharding, connection pooling)
  - Caching strategies
  - Multi-region deployment
  - Kubernetes manifests
  - Cost optimization

- ✅ **BETA-LAUNCH.md**: Guía completa de lanzamiento beta privada
  - Pre-launch checklist
  - Deployment steps
  - Stripe product setup
  - Beta user onboarding
  - Metrics to track
  - Incident response
  - Weekly sprint cycle
  - Beta exit criteria

- ✅ **QUICKSTART.md**: Quick start en 15 minutos
  - Setup rápido con Docker
  - Environment configuration
  - Test workflows
  - Common issues & solutions

- ✅ **FASE-3B-RESUMEN.md**: Resumen ejecutivo de Fase 3B
  - Features implementadas detalladas
  - Database schema changes
  - Environment variables
  - Testing guide
  - Checklist de lanzamiento

- ✅ **EXECUTIVE-SUMMARY.md**: Resumen ejecutivo completo del proyecto
  - Vision & Mission
  - Market opportunity
  - Business model & unit economics
  - Go-to-market strategy
  - Technical architecture
  - Financial projections
  - Investment ask

#### Changed

- **README.md**: Actualizado con nuevas features de Fase 3B
  - Estado del proyecto: v3.0 Commercial Launch Ready
  - Nuevas secciones: Payments & SaaS, Monitoring, Backups
  - Roadmap actualizado con Fase 3A y 3B completadas
  - Links a nueva documentación

- **.env.example**: Añadidas variables para:
  - Stripe (secret key, publishable key, webhook secret)
  - Backups (schedule, retention, S3 config, webhook URL)
  - Monitoring (Prometheus pushgateway, Grafana password)

- **app.module.ts**: Registrados nuevos módulos globales:
  - PaymentsModule
  - MonitoringModule
  - MetricsInterceptor como APP_INTERCEPTOR global

- **fiscal.module.ts**: Añadidos nuevos servicios:
  - Modelo347Service
  - SIIService

#### Database Schema

- **Nuevos modelos Prisma**:
  ```prisma
  model SubscriptionPlan {
    // Plan de subscripción con límites y features
  }

  model Subscription {
    // Subscripción activa de company
    // Tracking de usage: invoicesThisMonth, aiMessagesThisMonth
  }

  model Payment {
    // Registro de payments de Stripe
  }
  ```

- **Nuevos enums**:
  - `SubscriptionStatus`: TRIALING, ACTIVE, PAST_DUE, CANCELED, UNPAID
  - `PaymentStatus`: PENDING, SUCCEEDED, FAILED, REFUNDED

#### Infrastructure

- **Docker Services añadidos**:
  - `backup-scheduler`: Automated backup cron job
  - `pushgateway`: Prometheus Pushgateway para backup metrics
  - `prometheus`: Metrics collection & alerting
  - `grafana`: Dashboards & visualization
  - `postgres-exporter`: PostgreSQL metrics exporter
  - `redis-exporter`: Redis metrics exporter
  - `node-exporter`: System metrics exporter

### 🔧 Technical Improvements

- ✅ Metrics auto-collection via interceptor (no código adicional en controllers)
- ✅ Backup metrics integrados en Grafana (4 paneles nuevos)
- ✅ Alert rules configuradas para backups (4 alertas nuevas)
- ✅ Stripe webhook signature verification
- ✅ Subscription state sync automático con Stripe
- ✅ Usage counters con reset automático mensual

### 📊 Metrics & Performance

- **Build time**: ~48 segundos (4 packages)
- **Test coverage**: 90%+ mantenido
- **Total archivos creados/modificados**: 45+
- **Total líneas de código añadidas**: ~4,500

### 🐛 Bug Fixes

- Ninguno (release sin bugs conocidos)

### ⚠️ Breaking Changes

- Ninguno (backwards compatible con Fase 3A)

### 🔐 Security

- ✅ Stripe webhook signature verification implementada
- ✅ Backup encryption at rest (S3)
- ✅ Secrets management via environment variables
- ✅ Rate limiting en webhook endpoints

---

## [2.0.0] - 2024-12-20 - AI Avanzado + Multi-Blockchain

### 🚀 Fase 2: Advanced AI & Multi-Blockchain

#### Added - AI Features

- **Predicción Fiscal en Tiempo Real**:
  - ✅ Cálculo automático de tax liability por trimestre
  - ✅ Predicción IRPF por tramos (19%-47%)
  - ✅ Predicción Impuesto de Sociedades (25%)
  - ✅ Proyección anual basada en datos históricos
  - ✅ Insights y recomendaciones fiscales

- **Categorización Batch AI**:
  - ✅ Categorización masiva de transacciones crypto
  - ✅ 20+ categorías detectadas automáticamente
  - ✅ Procesamiento paralelo con BullMQ
  - ✅ Feedback loop para mejorar accuracy

- **Knowledge Base Expandida**:
  - ✅ Documentación AEAT completa (IVA, IRPF, Sociedades)
  - ✅ Normativa BOICAC (Plan General Contable)
  - ✅ Case law y precedentes fiscales
  - ✅ RAG (Retrieval-Augmented Generation) mejorado

- **Multi-idioma (ES/EN)**:
  - ✅ AI responde en idioma del usuario
  - ✅ Soporte para prompts en español e inglés
  - ✅ Knowledge base bilingüe

- **OCR Avanzado**:
  - ✅ PaddleOCR auto-hospedado (privacy-first)
  - ✅ Fallback chain: Google Vision → PaddleOCR → AI extraction
  - ✅ Integración en formularios de facturas
  - ✅ Extracción automática de campos (NIF, importe, fecha)

#### Added - Blockchain

- **2 Nuevas Blockchains**:
  - ✅ Solana (non-EVM)
  - ✅ Bitcoin (UTXO model)

- **Total soportadas**: 9 blockchains
  - EVM: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche
  - Non-EVM: Solana, Bitcoin

#### Added - Analytics

- **Dashboard Interactivo con Chart.js**:
  - ✅ Doughnut chart (portfolio distribution)
  - ✅ Line chart (monthly trends)
  - ✅ Bar chart (top assets)
  - ✅ Real-time updates

- **Reportes Mejorados**:
  - ✅ CSV export de transacciones
  - ✅ Tax calculator con tramos IRPF
  - ✅ Portfolio performance over time

#### Changed

- **AI Chat**: Context awareness mejorado (conversación + archivos + knowledge base)
- **Database**: Optimizaciones de queries (indexes añadidos)
- **Frontend**: Migración a Angular signals

#### Fixed

- OCR: Manejo de errores en imágenes corruptas
- AI: Timeout handling en requests largos
- Charts: Rendering issues en mobile

---

## [1.0.0] - 2024-11-15 - MVP Launch

### 🚀 Fase 1: MVP (Minimum Viable Product)

#### Added - Core Features

- **Contabilidad Completa**:
  - ✅ Plan General Contable español
  - ✅ Asientos contables automáticos
  - ✅ Ejercicios fiscales
  - ✅ Balance y PyG

- **Facturación Electrónica**:
  - ✅ Verifactu COMPLETO (AEAT)
  - ✅ Hash chain SHA-256
  - ✅ QR codes
  - ✅ Envío SOAP a AEAT
  - ✅ XML firmado

- **Crypto Básico**:
  - ✅ 7 blockchains EVM soportadas
  - ✅ FIFO automático
  - ✅ Integración con exchanges
  - ✅ Modelo 721 (declaración crypto)

- **AI Básico**:
  - ✅ Chat asistente contable
  - ✅ OCR con Google Cloud Vision
  - ✅ Knowledge base AEAT básica

- **Multi-tenancy**:
  - ✅ Soporte múltiples empresas
  - ✅ RBAC (Role-Based Access Control)
  - ✅ User management

#### Infrastructure

- ✅ NestJS + Angular stack
- ✅ PostgreSQL + Prisma
- ✅ BullMQ workers
- ✅ Docker Compose setup
- ✅ 421 tests (90%+ coverage)

---

## Release Notes Format

```
## [Version] - YYYY-MM-DD - Title

### Added
- New features

### Changed
- Changes to existing features

### Deprecated
- Features marked for removal

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```

---

**Versión actual**: 3.0.0
**Última actualización**: 2025-01-08
