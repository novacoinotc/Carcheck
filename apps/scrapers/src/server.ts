import express, { type Request, type Response } from 'express';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { bearerAuth } from './lib/auth';
import { workerRegistry } from './workers/registry';
import { healthCheck } from './lib/health';

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', async (_req: Request, res: Response) => {
  const status = await healthCheck();
  res.status(status.ok ? 200 : 503).json(status);
});

app.get('/sources', bearerAuth, (_req: Request, res: Response) => {
  res.json({
    sources: Object.keys(workerRegistry),
    count: Object.keys(workerRegistry).length,
  });
});

app.post('/scrape/:source', bearerAuth, async (req: Request<{ source: string }>, res: Response) => {
  const source = req.params.source;
  const worker = workerRegistry[source];
  if (!worker) {
    res.status(404).json({ error: `Unknown source: ${source}` });
    return;
  }

  const start = Date.now();
  try {
    const result = await worker.run(req.body);
    res.json({
      ...result,
      sourceKey: source,
      workerNode: process.env.RAILWAY_REPLICA_ID ?? 'local',
      responseTimeMs: Date.now() - start,
    });
  } catch (err) {
    req.log.error({ err, source }, 'scraper-failed');
    res.status(500).json({
      sourceKey: source,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : String(err),
      responseTimeMs: Date.now() - start,
    });
  }
});

app.listen(port, () => {
  logger.info({ port }, '🕷  CarCheck scrapers service listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
