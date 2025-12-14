# Crypto-ERP

Sistema ERP completo para gestión contable, facturación electrónica con Verifactu, y contabilidad de criptomonedas con cumplimiento fiscal español.

## 🚀 Estado del Proyecto

**Versión**: 3.0 (Fase 3B completada - Enero 2025)
**Estado**: ✅ **Commercial Launch Ready** 🎉
**Coverage**: 90%+ (421 tests)
**Capacidad**: 100-500 usuarios concurrentes

---

## ✨ Características Principales

### 💼 Contabilidad
- Plan General Contable (PGC) español completo
- Asientos contables automáticos
- Ejercicios fiscales y cierres
- Balance de situación y Cuenta de PyG
- Libro mayor y libro diario

### 🧾 Facturación Electrónica & Compliance
- Sistema **Verifactu COMPLETO** (AEAT)
- **SII** - Suministro Inmediato de Información (envío 4 días)
- **Modelo 347** - Declaración operaciones >3,005€
- Hash chain SHA-256 + QR codes
- Envío SOAP a AEAT con reintentos
- Generación de XML firmado AEAT
- Series de facturación configurables
- Gestión de contactos (clientes/proveedores)
- Exportación a PDF

### ₿ Crypto & Blockchain
- **9 blockchains soportadas**:
  - EVM: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche
  - Non-EVM: Solana, Bitcoin
- Cálculo FIFO automático (cost basis)
- 20+ tipos de transacciones auto-detectadas
- Integración con exchanges (Coinbase, Kraken, Binance)
- Portfolio tracking en tiempo real
- Modelo 721/720 (declaración criptomonedas)

### 🤖 Inteligencia Artificial
- **Chat asistente contable** con RAG (Retrieval-Augmented Generation)
- **Predicción fiscal** en tiempo real
- **OCR inteligente** para facturas (Google Vision + PaddleOCR + AI)
- **Categorización batch** de transacciones crypto
- Knowledge base AEAT (IVA, IRPF, Impuesto Sociedades, BOICAC)
- Soporte **multi-idioma** (Español + Inglés)
- Insights y recomendaciones automáticas

### 📊 Analytics & Reporting
- Dashboard interactivo con Chart.js
- Gráficos de portfolio (doughnut chart)
- Tendencias mensuales (line charts)
- Reportes fiscales (CSV export)
- Tax calculator con tramos IRPF

### 💳 Payments & SaaS
- **Stripe integration** completa (Checkout + Webhooks)
- **3 Subscription tiers**: Free, Pro (€29/mes), Enterprise (€99/mes)
- Trial de 14 días en planes de pago
- Usage limits por plan (facturas/mes, AI messages/mes)
- Customer Portal para gestión de subscripción
- Upgrade/downgrade automático

### 📈 Monitoring & Observability
- **Prometheus** para métricas (15+ métricas personalizadas)
- **Grafana** dashboards (16 paneles pre-configurados)
- **Sentry** para error tracking
- Alertas automáticas (18 reglas configuradas)
- Business metrics (MRR, churn, subscriptions activas)

### 💾 Backups & DR
- **Backups automáticos** diarios (cron scheduler)
- Upload automático a **AWS S3**
- Política de retención (7d/4w/12m)
- Restauración segura con safety backup
- Métricas de backup integradas en Grafana

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Backend**: NestJS 10 + TypeScript
- **Frontend**: Angular 17 (standalone components + signals)
- **Database**: PostgreSQL 15 + Prisma ORM
- **Workers**: BullMQ + Redis
- **AI**: Anthropic Claude 3.5, OpenAI GPT-4, Ollama
- **OCR**: Google Cloud Vision, PaddleOCR
- **Blockchain**: Covalent GoldRush API
- **Charts**: Chart.js + ng2-charts
- **Payments**: Stripe
- **Monitoring**: Prometheus + Grafana + Sentry
- **Backups**: Automated PostgreSQL backups → S3

---

## 🚀 Quick Start

### Requisitos Previos
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (o usar Docker)
- Redis 7+ (o usar Docker)

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con tus API keys:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cryptoerp"

# AI (elegir uno o varios)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434

# Blockchain
COVALENT_API_KEY=cqt_...
COINGECKO_API_KEY=CG-...

# OCR (opcional)
GOOGLE_CLOUD_API_KEY=...
PADDLE_OCR_URL=http://localhost:8866
```

### 3. Arrancar Base de Datos

```bash
docker-compose up -d postgres redis
```

### 4. Migrar Base de Datos

```bash
npm run db:migrate
npm run db:seed  # Datos de ejemplo (opcional)
```

### 5. Arrancar Aplicación

```bash
npm run dev
```

Esto arranca:
- API: http://localhost:3000
- Web: http://localhost:4200
- Worker: background

---

## 📖 Documentación

- [Fase 2 Completada](docs/FASE-2-COMPLETED.md) - Documentación detallada de todas las features
- [Plan Fase 2](docs/FASE-2-PLAN.md) - Plan original de implementación
- [API Docs](http://localhost:3000/api-docs) - Swagger UI

---

## 🧪 Testing

```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage report
```

**Cobertura actual**: 90%+ (421 tests)

---

## 📦 Build

```bash
npm run build
```

---

## 🗺️ Roadmap

### ✅ Fase 1 - MVP (Completada)
- Autenticación JWT
- Contabilidad PGC
- Facturación básica
- Verifactu AEAT
- 7 Blockchains EVM
- AI Chat básico

### ✅ Fase 2 - AI Avanzado + Multi-Blockchain (Completada)
- Predicción fiscal en tiempo real
- Categorización batch AI
- Knowledge base expandida (AEAT)
- Multi-idioma (ES/EN)
- PaddleOCR auto-hospedado
- Solana + Bitcoin
- Dashboard con charts interactivos
- OCR en formularios
- AI Chat mejorado (context, history, files)

### ✅ Fase 3A - MVP Production (Completada)
- Email notifications (Resend)
- User invitations system
- Two-Factor Authentication (2FA)
- Audit logging completo
- GDPR compliance (data export/deletion)
- Error tracking (Sentry)
- CI/CD pipeline (GitHub Actions)

### ✅ Fase 3B - Commercial Launch (Completada)
- **Modelo 347** - Declaración operaciones >3,005€
- **SII** - Suministro Inmediato de Información
- **Stripe integration** - Pagos + Subscripciones
- **Subscription tiers** - Free/Pro/Enterprise
- **Prometheus + Grafana** - Monitoring production
- **Automated backups** - PostgreSQL → S3
- Documentación completa (Deployment + Scaling)

### 🔄 Fase 3C - Enterprise Ready (Futura)
- Multi-región deployment
- SSO/SAML integration
- Advanced analytics (BigQuery)
- White-label branding
- Webhooks salientes
- Mobile app (React Native)
- NFT support
- Staking rewards

---

## 📚 Documentación

- **[Quick Start Guide](QUICKSTART.md)** - Arranca en 15 minutos
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy completo a producción
- **[Scaling Guide](docs/SCALING.md)** - Escala de 10 a 10,000+ usuarios
- **[Beta Launch Guide](docs/BETA-LAUNCH.md)** - Lanzar beta privada (10-20 usuarios)
- **[Fase 3B Summary](docs/FASE-3B-RESUMEN.md)** - Resumen features comerciales
- **[API Documentation](http://localhost:3000/api-docs)** - Swagger UI (cuando API está corriendo)

---

## 🎯 Roadmap Lanzamiento

### Q1 2025 - Beta Privada ✅
- [x] Compliance fiscal completo (Verifactu + SII + Modelo 347)
- [x] Payment system (Stripe)
- [x] Monitoring & backups
- [x] Security hardening (2FA + GDPR)
- [ ] Beta con 10-20 usuarios

### Q2 2025 - Public Launch
- [ ] Libro Registro de Facturas oficial (Feature 10)
- [ ] Onboarding flow mejorado
- [ ] Marketing website
- [ ] Documentación usuario final
- [ ] Lanzamiento público

### Q3 2025 - Growth
- [ ] Mobile app beta
- [ ] Multi-región (EU + US)
- [ ] SSO/SAML para enterprise
- [ ] Advanced analytics dashboard

---

**Desarrollado con ❤️ para profesionales del crypto en España**
