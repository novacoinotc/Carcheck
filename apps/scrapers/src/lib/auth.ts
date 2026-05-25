import type { Request, Response, NextFunction } from 'express';

const EXPECTED = process.env.SCRAPERS_AUTH_TOKEN;

export function bearerAuth(req: Request, res: Response, next: NextFunction): void {
  if (!EXPECTED) {
    res.status(500).json({ error: 'SCRAPERS_AUTH_TOKEN not configured' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ') || auth.slice(7) !== EXPECTED) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
