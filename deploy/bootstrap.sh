#!/usr/bin/env bash
#
# CarCheck scrapers — one-shot server bootstrap for a fresh Ubuntu 24.04 droplet.
# Run as root on the NEW dedicated server (NOT the one with the trading bot).
#
#   curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/deploy/bootstrap.sh | bash
#   — or — scp this file over and: bash bootstrap.sh
#
# It is idempotent: safe to re-run.
set -euo pipefail

REPO_URL="${REPO_URL:-}"           # e.g. https://github.com/novacorp-mx/carcheck.git
APP_DIR="/opt/carcheck"
SWAP_SIZE="${SWAP_SIZE:-2G}"

echo "==> 1/7 System update + base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw fail2ban gnupg

echo "==> 2/7 Swap (${SWAP_SIZE}) as OOM safety"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l "${SWAP_SIZE}" /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 3/7 Firewall (allow SSH + HTTP + HTTPS only)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> 4/7 Docker + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

echo "==> 5/7 Fetch code"
if [ -n "$REPO_URL" ]; then
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull --ff-only
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
else
  echo "    REPO_URL not set — assuming code is already in $APP_DIR (scp/rsync)."
  mkdir -p "$APP_DIR"
fi

echo "==> 6/7 Check env file"
ENV_FILE="$APP_DIR/deploy/scrapers.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "    ⚠ Missing $ENV_FILE"
  echo "    Copy deploy/scrapers.env.example to deploy/scrapers.env and fill it, then re-run."
  echo "    Generate a token with: openssl rand -base64 32"
  exit 1
fi

echo "==> 7/7 Build + start (Docker Compose)"
cd "$APP_DIR/deploy"
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
export SCRAPERS_DOMAIN
docker compose up -d --build

echo ""
echo "✅ Done. Verify:"
echo "   curl https://\${SCRAPERS_DOMAIN}/health"
echo "   docker compose -f $APP_DIR/deploy/docker-compose.yml logs -f scrapers"
