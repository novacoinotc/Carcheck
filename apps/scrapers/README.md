# @carcheck/scrapers

Playwright-based scraping service for CarCheck. Runs on Railway (Docker).
Exposes HTTP endpoints that the Vercel-hosted orchestrator calls.

## Endpoints

- `GET /health` — readiness probe (returns 503 until browser is warm)
- `GET /sources` — lists implemented worker keys
- `POST /scrape/:source` — runs the named worker; body is `{ vin?, plate?, state? }`

All non-health endpoints require `Authorization: Bearer ${SCRAPERS_AUTH_TOKEN}`.

## Environment

- `SCRAPERS_AUTH_TOKEN` — required, shared with the Vercel app
- `TWOCAPTCHA_API_KEY` — for captcha-protected sources (REPUVE, OCRA, NICB)
- `BRIGHTDATA_USERNAME` / `BRIGHTDATA_PASSWORD` / `BRIGHTDATA_HOST` / `BRIGHTDATA_PORT` — residential proxies
- `MAX_CONCURRENT_BROWSERS` — default 3
- `PORT` — default 8080
- `LOG_LEVEL` — default `info`

## Local dev

```bash
pnpm --filter @carcheck/scrapers playwright:install   # one-time
pnpm --filter @carcheck/scrapers dev
```

## Deploy

Linked from the project root:

```bash
railway link              # one-time
railway up                # deploys with the Dockerfile
```
