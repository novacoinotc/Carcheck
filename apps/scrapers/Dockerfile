FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

ENV NODE_ENV=production \
    PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN npm install -g pnpm@10.29.2

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/tsconfig/ ./packages/tsconfig/
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/scrapers/package.json ./apps/scrapers/

RUN pnpm install --frozen-lockfile --filter @carcheck/scrapers...

COPY apps/scrapers/ ./apps/scrapers/

RUN pnpm --filter @carcheck/scrapers build

EXPOSE 8080

CMD ["node", "apps/scrapers/dist/server.js"]
