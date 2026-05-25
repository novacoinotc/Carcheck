# CarCheck

> Plataforma de auditoría vehicular para México y Estados Unidos. Consulta más de 90 fuentes oficiales en paralelo y un análisis de Claude AI interpreta toda la información cruda para el comprador final.

**Status**: 🚧 Fase 0 (setup) completa · MVP Phase 1+ en construcción

## Stack

| Capa | Tecnología |
|---|---|
| Web + API | Next.js 16 (App Router) en Vercel Pro |
| Base de datos | Neon PostgreSQL (vía Vercel Marketplace) |
| ORM | Drizzle |
| Cache | Upstash Redis (vía Vercel Marketplace) |
| Auth | Clerk v7 (vía Vercel Marketplace) |
| Storage | Vercel Blob (PDFs) |
| IA | Vercel AI Gateway → Claude Opus 4.7 / Sonnet 4.6 |
| Orquestación | Vercel Workflow DevKit (`workflow` 5.x beta) |
| Pagos | Mercado Pago (MX) + Stripe (US) |
| Scrapers | Playwright + 2Captcha + Bright Data, hospedado en **Railway** |

## Estructura

```
carcheck/
├── apps/
│   ├── web/                    Next.js 16 — UI, API, orquestador, IA
│   └── scrapers/               Express + Playwright en Railway
└── packages/
    ├── db/                     Drizzle schema + seed (96 fuentes)
    ├── cache/                  Upstash Redis wrapper
    ├── shared-types/           Tipos + Zod schemas + validador VIN
    ├── sources/                Clientes API (NHTSA, NMVTIS, etc.)
    ├── risk-engine/            Score heurístico previo a IA
    ├── ai-analyst/             Vercel AI Gateway + Claude system prompt
    └── tsconfig/               TypeScript base configs
```

## Setup local

### 1. Prerrequisitos

- Node.js 24+ (`nvm use` o `.nvmrc`)
- pnpm 10+
- Cuentas en Vercel + Railway + Anthropic (para AI Gateway)

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Link a Vercel y pull env vars

```bash
vercel link --project carcheck
vercel env pull .env.local --yes
```

Esto trae automáticamente las variables de Neon, Clerk y Upstash (si ya están provisionadas vía Marketplace). Para variables que no están en Vercel (Mercado Pago, 2Captcha, etc.), agrégalas a `.env.local` siguiendo `.env.example`.

### 4. Aplicar schema a Neon

```bash
pnpm db:generate         # genera SQL de migración
pnpm db:migrate          # aplica a la rama de Neon conectada
pnpm db:seed             # carga las 96 fuentes en source_registry
```

### 5. Correr la app

```bash
pnpm dev
```

Abre http://localhost:3000

### 6. Correr scrapers en local (opcional)

```bash
pnpm --filter @carcheck/scrapers playwright:install     # una sola vez
pnpm --filter @carcheck/scrapers dev
```

Escucha en http://localhost:8080

## Provisionar integraciones (primera vez)

Si vienes desde cero o el equipo es nuevo:

```bash
vercel integration add neon -n carcheck-db
vercel integration add clerk -n carcheck-auth
vercel integration add redis -n carcheck-cache   # abre browser para flujo OAuth
vercel env pull .env.local --yes
```

## Comandos útiles

```bash
pnpm build               # build de todo el monorepo
pnpm typecheck           # tsc en todos los packages
pnpm lint                # eslint
pnpm db:studio           # GUI Drizzle Studio
pnpm format              # prettier
```

## Despliegue

### Web (Vercel)

Cada push a `main` despliega producción. PRs generan preview.

### Scrapers (Railway)

```bash
railway link
railway up
```

Mantén `SCRAPERS_BASE_URL` y `SCRAPERS_AUTH_TOKEN` en Vercel apuntando al servicio Railway.

## Fases del MVP

| Fase | Días | Estado |
|---|---|---|
| 0 — Setup | 1-3 | ✅ Completa |
| 1 — VIN decoder gratis (NHTSA + Recalls) | 4-7 | ✅ Completa |
| 2 — Fuentes con API (NMVTIS, SAT, MarketCheck, Market Value) | 8-14 | ✅ Completa |
| 2.5 — Capa IA con Claude Opus 4.7 | 15-18 | ✅ Completa |
| 3 — Scrapers MX federales (REPUVE, OCRA, RUG, ANAM, PROFECO) + Dashboard | 19-35 | ✅ Completa |
| 4 — 32 estados MX + verificación ambiental | 36-55 | ⏳ |
| 5 — Pagos + PDF + share links públicos | 56-75 | ⏳ |
| 6 — Subastas, OEM, API B2B, launch | 76-90 | ⏳ |

## Scrapers en Railway

El servicio `carcheck-scrapers` corre en Railway con Playwright + Chromium. Expone HTTP a Vercel.

```bash
# Setup inicial (una vez)
railway link --project carcheck-scrapers

# Deploy nueva versión
railway up --service carcheck-scrapers

# Ver logs
railway logs --service carcheck-scrapers
```

Phase 3 scrapers: REPUVE, RUG, ANAM Pediment, ANAM Regularización, PROFECO Alertas, AMDA, NICB.
Sin `TWOCAPTCHA_API_KEY` los workers protegidos por CAPTCHA (REPUVE, NICB) regresan `skipped`.

## Cumplimiento legal (LFPDPPP MX + DPPA US)

- **NUNCA** exponer el nombre del propietario en ningún reporte.
- Solo eventos asociados a VIN/placa.
- Aviso de privacidad registrado en INAI obligatorio.
- Términos de uso con propósito permisible.

Ver `docs/SOURCES.md` para el catálogo completo de fuentes con notas legales por fuente.

## Documentación adicional

- [docs/SOURCES.md](docs/SOURCES.md) — Catálogo de 96 fuentes
- [apps/scrapers/README.md](apps/scrapers/README.md) — Detalles del servicio de scrapers

---

© NOVACORP / Empire Group. Todos los derechos reservados.
