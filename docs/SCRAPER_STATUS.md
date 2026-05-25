# CarCheck — Estado real de fuentes (diagnóstico en vivo)

Capturado vía endpoint `/inspect` contra los sitios reales desde el box DO (2026-05-25).
Este doc es el backlog priorizado de tuning de scrapers.

## Categorías de bloqueo

1. **Selector tuning** — el sitio carga, falta ajustar selectores al HTML real.
2. **CAPTCHA** — requiere 2captcha cableado al form (key ya configurada).
3. **CDN anti-bot** — bloquea IP datacenter; requiere proxies residenciales.
4. **API de pago** — reemplaza scraping con API key (más confiable).
5. **URL movida/404** — la ruta cambió, hay que encontrar la nueva.

## Diagnóstico Tier 1 MX

| Fuente | Carga | Captcha | Estructura real | Acción |
|---|---|---|---|---|
| **REPUVE** | ✅ directo | reCAPTCHA v2 (`g-recaptcha-response-100000`) | SPA. Inputs por placeholder: "Ingresa tu placa", "Ingresa tu número de serie", "folio", "constancia". Botón "Buscar". | Cablear 2captcha reCAPTCHA + sitekey dinámico del iframe + fill por placeholder + parse resultado SPA |
| **CDMX finanzas** | ✅ vía proxy | Imagen (`captcha_code`) | Inputs: `inputPlaca`, `captcha_code` | Descargar img captcha → 2captcha base64 → fill → parse |
| **NL (icvnl)** | ✅ directo | No | ASP.NET (`__VIEWSTATE`). El form de refrendo está tras navegación/JS, no en la home | Encontrar la sub-página del estado de cuenta + postback ASP.NET |
| **RUG** | ❌ 404 | — | `rug.economia.gob.mx/ConsultaPublica/Buscador` ya no existe | Encontrar nueva URL del RUG |
| **ANAM** | ❌ timeout/CDN | — | Bloquea datacenter (ERR_HTTP2 / empty) | Requiere proxies residenciales |

## Realidad del esfuerzo

Cada fuente es un mini-proyecto de ingeniería inversa: HTML propio, defensas propias, muchas
cambian con el tiempo (mantenimiento continuo). 60+ fuentes = semanas de trabajo iterativo.
Esto es exactamente por qué Carfax y competidores tienen equipos dedicados a scrapers.

## Path de mayor ROI (en orden)

1. **VinAudit API key** ($0.25-2.49/consulta) → desbloquea NMVTIS (robo US, salvage, título,
   odómetro) + market value SIN scraping. La fuente US más valiosa, vía API confiable.
2. **Proxies residenciales Webshare** → desbloquea toda la categoría CDN (ANAM, OEM, Copart real).
3. **Tuning per-site MX** priorizado: REPUVE → CDMX → EdoMex → Jalisco → NL (los 5 estados de
   mayor tráfico cubren ~70% de los autos).
4. **API keys US opcionales** (MarketCheck, AutoCheck) para historial de listings + accidentes.

## Lo que YA funciona (sin trabajo extra)

- NHTSA vPIC (decode) ✅ · NHTSA Recalls ✅ · Copart (vía proxy) ✅ · CDMX (parcial) ✅
- Toda la infraestructura: orquestador, IA Claude, persistencia, PDF, share, dashboard.
