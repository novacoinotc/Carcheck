# CarCheck — Engineering Log & Master State

> **Propósito**: memoria persistente del proyecto. Si se pierde el contexto de la conversación,
> este doc permite retomar TODO sin perder el hilo. Se actualiza con cada avance (prueba → guardar).
> Última actualización: 2026-05-25.

---

## 1. Qué es CarCheck

Plataforma de auditoría vehicular para México + US (tipo Carfax pero más completa + IA).
Audita un auto por VIN/placa consultando **96 fuentes** y Claude AI interpreta todo en un reporte.
Diferenciador: cobertura de los 32 estados MX + historial US + análisis IA + foco en autos chocolate.
Owner: NOVACORP (Mr. Nova). UI español MX, código en inglés.

---

## 2. Arquitectura e infraestructura LIVE

| Componente | Dónde | Estado |
|---|---|---|
| Web app (Next.js 16) | Vercel — `app.carcheckmx.com` (app), `carcheckmx.com` (landing, apex propagando) | ✅ live |
| Scrapers (Express+Playwright) | DigitalOcean droplet `159.223.179.79` 8GB — `scrapers.carcheckmx.com` | ✅ live (HTTPS via Caddy) |
| DB | Neon Postgres (Vercel Marketplace), Drizzle ORM, 13 tablas, 96 fuentes seeded | ✅ |
| Auth | Clerk v7 (Marketplace) | ✅ |
| Cache | Upstash Redis (Marketplace) | ✅ |
| IA | `@ai-sdk/anthropic` direct, Claude Opus 4.7 / Sonnet 4.6, prompt caching, maxOutputTokens 8192 | ✅ |
| Repo | github.com/novacoinotc/Carcheck (privado, branch main) | ✅ |
| Proxies | Webshare, 30 datacenter IPs rotando (lista en deploy/scrapers.env), user `ynrfywjx` | ✅ datacenter (residential pendiente del user) |
| CAPTCHA | 2captcha key configurada en el box | ✅ |

**Monorepo (Turborepo + pnpm)**: `apps/web`, `apps/scrapers`, `packages/{db,cache,shared-types,sources,risk-engine,ai-analyst,tsconfig}`.

---

## 3. Accesos y cómo operar

```bash
# SSH al box de scrapers
ssh -i ~/.ssh/carcheck_do root@159.223.179.79

# Auth token de scrapers (igual en deploy/scrapers.env y en Vercel env SCRAPERS_AUTH_TOKEN)
TOK=LRME62_NAP24y4X-wWw3bTpnvZ6glzRPjKa6VUzN7-Q

# Health
curl https://scrapers.carcheckmx.com/health
# Listar workers
curl -H "Authorization: Bearer $TOK" https://scrapers.carcheckmx.com/sources
# Diagnóstico de estructura de un sitio
curl -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"url":"https://...","proxy":false}' http://localhost:8080/inspect   # (en el box)
# Probar un scraper
curl -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"vin":"...","plate":"...","state":"..."}' http://localhost:8080/scrape/<source_key>
```

Vercel: CLI autenticado como `novacoinotc`. Token en `~/Library/Application Support/com.vercel.cli/auth.json`.
projectId `prj_4FnurJm4YLUjWz5CGcvvQeVO2avf`, teamId `team_Oe6kzwIsVMh1UEfigj8PUM7N`.
GitHub: `gh` autenticado como novacoinotc.

---

## 4. FLUJO DE TRABAJO RÁPIDO (hot-reload) — el loop de ingeniería

El box corre en **modo dev** (tsx watch) para iterar en ~6s en vez de 4min de rebuild:
```bash
# El box ya está levantado con: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
# Loop por fuente:
# 1. inspeccionar el sitio real
curl -X POST .../inspect -d '{"url":"<URL>","proxy":<bool>}'
# 2. editar el worker en apps/scrapers/src/workers/...
# 3. rsync src (tsx recarga solo)
rsync -az -e "ssh -i ~/.ssh/carcheck_do" ./apps/scrapers/src/ root@159.223.179.79:/opt/carcheck/apps/scrapers/src/
sleep 6
# 4. probar contra el sitio real y GUARDAR el resultado en este doc (sección 6)
```
**Para producción estable**: cuando un batch de fuentes esté afinado, hacer rebuild del image:
`ssh ... 'cd /opt/carcheck/deploy && docker compose up -d --build'` (vuelve a modo build).

---

## 5. Patrones probados (reutilizables)

- **reCAPTCHA v2** (`lib/captcha.ts` solveReCaptchaV2): solver 2captcha + inyectar token en
  `textarea[name=g-recaptcha-response]` + invocar callback de `___grecaptcha_cfg`. ⚠️ En SPAs
  endurecidas (REPUVE) el token se rechaza — leen el token de forma que la inyección no satisface.
  Pendiente: interceptar el AJAX del SPA o proveedor de datos.
- **Captcha de imagen** (CDMX): screenshot del `<img>` → base64 → `solveImageCaptcha`. Funciona.
- **Estrategia de proxy POR SITIO** (clave): unos cargan directo (REPUVE, NL), otros SOLO vía proxy
  (CDMX, ANAM, Copart). Cada worker pasa `{ proxy: 'off' | 'always' | 'auto' }` a `withPage`.
- **HTTP/1.1 forzado** (`--disable-http2` en browser-pool): los proxies HTTP rompen HTTP/2 de Chromium.
- **ASP.NET VIEWSTATE** (NL icvnl): forms con `__VIEWSTATE`, el form de resultado está tras navegación.

---

## 6. BACKLOG DE FUENTES (estado real — actualizar tras cada prueba)

Leyenda: ✅ funciona · 🟡 pipeline ok / falta validar dato real · 🔧 en progreso · ⛔ bloqueado · ⏸ pendiente

### Vercel-side APIs (packages/sources)
| key | estado | nota |
|---|---|---|
| usa_fed_nhtsa_vpic | ✅ | decode, gratis |
| usa_fed_nhtsa_recalls | ✅ | maneja 400 como sin-recalls |
| mx_fed_sat_cfdi | 🟡 | necesita UUID+RFC de factura (no VIN) — estructural |
| usa_fed_nmvtis_vinaudit | ⏸ | **needs VINAUDIT_API_KEY** (user) |
| usa_private_vinaudit_market | ⏸ | needs VINAUDIT_API_KEY |
| usa_private_marketcheck_history | ⏸ | needs MARKETCHECK_API_KEY |
| usa_private_{autocheck,bumper,epicvin,clearvin,carsxe,dataone} | ⏸ | needs respective API keys |
| auction_{manheim,statvin} | ⏸ | needs API keys |

### Scrapers DO (apps/scrapers) — Tier 1 MX
| key | estado | hallazgo / next |
|---|---|---|
| mx_fed_repuve | ⛔ | reCAPTCHA v2 sitekey `6Lfy8AEoAAAAANclz0Doczn6y826fM0BjOPXEn9B`. Carga DIRECTO. Token rechazado (SPA hardened). Next: interceptar AJAX de búsqueda del SPA, o proveedor REPUVE. |
| mx_st_cdmx_control_vehicular | 🟡 | vía PROXY. `#inputPlaca`+`#captcha_code` (img captcha). Pipeline ok. Falta validar con placa CDMX real (parser detecta nav-words como falso positivo — endurecer). |
| mx_fed_rug | ⛔ | URL `rug.economia.gob.mx/ConsultaPublica/Buscador` da 404. Next: encontrar nueva URL del RUG. |
| mx_aduana_anam_quick | ⛔ | CDN bloquea datacenter (ERR_EMPTY_RESPONSE/HTTP2). **needs residential proxy**. |
| mx_st_jal_control_vehicular | ⏸ | Jalisco (sfp.jalisco.gob.mx). Placa real de prueba: JY53245. Inspeccionar. |
| mx_st_nl_control_vehicular | ⏸ | icvnl.gob.mx/EstadodeCuenta carga directo, ASP.NET, form tras navegación. |
| mx_env_cdmx_verificentros | ⏸ | smahologramas.dsinet.com.mx — historial verificación por placa. Inspeccionar. |

### Resto (defer / batch)
- 30+ estados restantes (factory) — inspeccionar uno por uno
- 6 fiscalías, 4 verificación, PROFECO, AMDA
- 9 OEM recalls + NICB → casi todos **needs residential proxy** (Akamai/CDN)
- Copart/IAA ✅ (vía proxy) · auctions agregadores ⏸ (API)

---

## 7. Lo que NECESITA intervención del user (desbloquea ~15+ de golpe)
1. **VinAudit API key** (vinaudit.com) → NMVTIS (robo/salvage/título/odómetro US) + market value. LA #1.
2. **Webshare → activar proxies residenciales** → desbloquea ANAM, OEMs, NICB, todo lo CDN.
3. API keys: MarketCheck, AutoCheck, Bumper, EpicVIN, ClearVin, CarsXE, DataOne, Manheim, Stat.vin.
4. Convenios: OCRA/AMIS (robo aseguradoras), Buró/Círculo (financiamiento).

---

## 8. Features de producto (estado)
- ✅ Landing detallada (comparación competencia, ventajas, casos, audiencias, FAQ 11)
- ✅ /decode VIN gratis · /ejemplo demo en vivo
- ✅ Dashboard (lista, nuevo reporte tier Esencial/Completo, detalle)
- ✅ PDF por reporte (`/api/reports/[id]/pdf`)
- ✅ Share links públicos (`/share/[token]` + botón Compartir)
- ✅ Orquestador (37 fuentes aplicables a VIN, paralelo) + persistencia Neon
- ✅ app subdomain routing (app.* → /dashboard)
- ⏸ Pagos (Mercado Pago/Stripe), notificaciones email

## 9. Fases completadas
0 Setup · 1 VIN decode+recalls · 2 APIs+IA · 2.5 Claude · 3 scrapers MX fed + dashboard · 4 las 96 fuentes scaffolded + deploy DO + dominios + PDF + share. **Ahora**: Fase 5 = tuning per-site de scrapers.

## 11. Diario de hallazgos (test → save)

### 2026-05-25 — SWEEP COMPLETO de 66 scrapers (scripts/sweep-sources.ts → /tmp/sweep.json)

Categorización automática inspeccionando cada sitio real (directo + proxy):

**LOADS_DIRECT_FORM (24)** — cargan directo CON form, máxima prioridad (llenar+parsear):
mx_fed_rug, mx_fed_amda, mx_fed_profeco_alertas, mx_env_cdmx_doble_cero, usa_fed_epa_certification,
usa_st_ca_smogcheck, auction_copart, oem_honda, oem_vw, oem_bmw, oem_mercedes, mkt_mx_autocosmos,
y estados: bc, bcs, camp, chih, coah, cdmx, gto, mich, nl, qroo, slp, tlax.

**LOADS_PROXY_FORM (2)**: mx_st_mor_control_vehicular, mkt_mx_kavak (cargan con form SOLO vía proxy).

**CAPTCHA_IMAGE (6)**: mx_fed_repuve(reCAPTCHA en realidad), mx_st_oax, mx_st_son, usa_fed_nicb_vincheck, oem_toyota, mkt_mx_seminuevos.

**LOADS_DIRECT_NOFORM (8)** — cargan pero el form es JS/async o frame: mx_st_chis, mx_st_qro, mx_st_yuc, mx_env_cdmx_verificentros, mx_judicial_fge_jalisco, mx_judicial_fge_veracruz, auction_iaa, mkt_mx_mercadolibre.

**OTHER_error (13)** — chrome-error (TLS/conexión): estados col, dgo, mex(EdoMex), gro, jal, nay, sin, tab, tamps, ver, zac + mx_env_jalisco_verificacion + mx_judicial_fgjem.

**UNREACHABLE (9)**: mx_aduana_anam_quick, mx_aduana_anam_regularizacion, mx_st_hgo, mx_st_pue, mx_env_edomex_verificacion, mx_judicial_fgjcdmx, mx_judicial_fge_puebla, oem_ford, oem_nissan.

**BLOCKED_CDN (4)**: mx_st_ags, mx_judicial_fge_nl, oem_gm, oem_stellantis.

**Plan de ataque**: (1) batch LOADS_DIRECT_FORM con la factory mejorada de estados; (2) PROXY_FORM; (3) CAPTCHA_IMAGE con 2captcha; (4) NOFORM con más wait/frame; (5) OTHER_error/UNREACHABLE/BLOCKED → mayoría needs residential proxy (user) o están caídos.

### 2026-05-25 — sweep diagnóstico inicial
- **REPUVE**: reCAPTCHA v2, sitekey `6Lfy8AEoAAAAANclz0Doczn6y826fM0BjOPXEn9B`, carga directo. Token 2captcha rechazado tras 3 retries → el SPA lee el token de forma que la inyección no satisface. NEXT: interceptar el AJAX de búsqueda del SPA (capturar la request de "Buscar" y reproducirla con el token) o proveedor REPUVE.
- **CDMX finanzas**: solo vía PROXY. `#inputPlaca` + `#captcha_code` (img). Worker custom hecho, pipeline ok. NEXT: placa CDMX real + endurecer parser (nav-words dan falso positivo).
- **RUG**: MIGRÓ a `https://rug.economia.gob.mx/Rug/home/inicio.do`. NEXT: hallar ruta de consulta pública y actualizar worker.
- **Jalisco (sfp.jalisco.gob.mx)**: ERROR directo Y proxy (chrome-error). NEXT: hallar URL real del consultaweb de refrendo Jalisco.
- **CDMX Verificentros (smahologramas.dsinet.com.mx)**: 200 pero body VACÍO → app JS/frameset. NEXT: más wait + entrar al frame.
- **NL (icvnl.gob.mx/EstadodeCuenta)**: carga directo, ASP.NET VIEWSTATE; form tras navegación. NEXT: hallar sub-página del form.

**Aprendizaje**: portales gob (1) cambian URL, (2) son apps JS async, (3) erroran sin path exacto, (4) o tienen captcha. Cada uno es investigación propia. Este diario test→save es el mecanismo anti-pérdida entre sesiones.

---

## 10. Checklist para retomar
1. Lee este doc completo primero. `ssh -i ~/.ssh/carcheck_do root@159.223.179.79` + `curl localhost:8080/health`
2. Confirmar modo dev activo (hot-reload). Si no: `cd /opt/carcheck/deploy && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
3. Tomar la siguiente fuente ⏸ del backlog (sección 6), inspeccionar, afinar, probar, **guardar resultado aquí**.
4. Placa real para validar Jalisco/federales: **JY53245** (VIN 1FTEW1E85NFC18609, Ford Lobo 2022 importado).
5. Nunca exponer nombre del propietario (LFPDPPP).
