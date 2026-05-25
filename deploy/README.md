# CarCheck scrapers — dedicated server deploy

Runs the Playwright scraping service on a dedicated VPS with Docker + Caddy (auto-HTTPS),
behind Webshare rotating proxies. Keep this OFF the box that runs the trading bot.

## 1. Server spec

Fresh **Ubuntu 24.04 LTS** droplet, dedicated to CarCheck:

| Tier | RAM | vCPU | Disk | Use |
|---|---|---|---|---|
| Minimum | 4 GB | 2 | 80 GB | 4 MX federal scrapers |
| Recommended | 8 GB | 4 | 160 GB | + 32 state scrapers in parallel |

DigitalOcean `s-2vcpu-4gb` (~$24/mo) or `s-4vcpu-8gb` (~$48/mo). Hetzner CPX31 is the value pick.

## 2. DNS

Point an A record at the droplet's public IP **before** starting Caddy (it needs the
domain reachable to provision the TLS cert):

```
scrapers.carcheck.mx.   A   <DROPLET_IP>
```

## 3. Secrets

On your machine, generate the shared auth token:

```bash
openssl rand -base64 32
```

Copy `deploy/scrapers.env.example` → `deploy/scrapers.env` and fill:
- `SCRAPERS_AUTH_TOKEN` (the token above — must match Vercel's)
- `PROXY_SERVER` / `PROXY_USERNAME` / `PROXY_PASSWORD` (Webshare)
- `TWOCAPTCHA_API_KEY` (for REPUVE/NICB)
- `SCRAPERS_DOMAIN` (e.g. scrapers.carcheck.mx)

## 4. Deploy

Option A — from GitHub (recommended, repeatable):

```bash
ssh root@<DROPLET_IP>
export REPO_URL=https://github.com/<org>/carcheck.git
curl -fsSL "$REPO_URL/raw/main/deploy/bootstrap.sh" | bash
# then scp your filled scrapers.env up and re-run, or paste it before running
```

Option B — upload code directly (no GitHub):

```bash
# from your machine, in the repo root
rsync -az --exclude node_modules --exclude .next --exclude .git ./ root@<DROPLET_IP>:/opt/carcheck/
ssh root@<DROPLET_IP> 'bash /opt/carcheck/deploy/bootstrap.sh'
```

`bootstrap.sh` installs Docker, swap, firewall, then `docker compose up -d --build`.

## 5. Wire to Vercel

```bash
vercel env rm SCRAPERS_BASE_URL production
vercel env add SCRAPERS_BASE_URL production   # https://scrapers.carcheck.mx
# SCRAPERS_AUTH_TOKEN must already match what's in scrapers.env
```

## 6. Verify

```bash
curl https://scrapers.carcheck.mx/health
curl -X POST https://scrapers.carcheck.mx/scrape/mx_fed_rug \
  -H "Authorization: Bearer $SCRAPERS_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vin":"3VWFE21C04M000001"}'
```

## Updating after code changes

```bash
ssh root@<DROPLET_IP>
cd /opt/carcheck && git pull && cd deploy && docker compose up -d --build
```

## Notes

- Caddy stores certs in the `caddy_data` volume — survives restarts.
- The scrapers container is memory-capped at 3 GB in compose; tune in docker-compose.yml.
- Concurrency: `MAX_CONCURRENT_BROWSERS` in scrapers.env (2 is safe on 4 GB).
- Logs: `docker compose logs -f scrapers`.
