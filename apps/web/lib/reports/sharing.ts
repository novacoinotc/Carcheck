import { db, sharedLinks, eq, and, sql } from '@carcheck/db';
import { getReportDetail, type ReportDetail } from '@/lib/reports/queries';

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates (or returns the existing) active public share link for a report.
 */
export async function createShareLink(
  reportId: string,
  dbUserId: string,
): Promise<{ token: string }> {
  const existing = await db
    .select({ token: sharedLinks.token })
    .from(sharedLinks)
    .where(and(eq(sharedLinks.reportId, reportId), eq(sharedLinks.isActive, true)))
    .limit(1);

  if (existing[0]) return { token: existing[0].token };

  const token = generateToken();
  await db.insert(sharedLinks).values({
    reportId,
    createdBy: dbUserId,
    token,
    isActive: true,
  });

  return { token };
}

/**
 * Resolves a public share token to its report. Increments access counters.
 * Returns null when the token is missing, revoked, or expired.
 */
export async function getReportByShareToken(token: string): Promise<ReportDetail | null> {
  const rows = await db
    .select({
      id: sharedLinks.id,
      reportId: sharedLinks.reportId,
      expiresAt: sharedLinks.expiresAt,
    })
    .from(sharedLinks)
    .where(and(eq(sharedLinks.token, token), eq(sharedLinks.isActive, true)))
    .limit(1);

  const link = rows[0];
  if (!link) return null;

  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return null;

  await db
    .update(sharedLinks)
    .set({
      accessCount: sql`${sharedLinks.accessCount} + 1`,
      lastAccessedAt: new Date(),
    })
    .where(eq(sharedLinks.id, link.id));

  return getReportDetail(link.reportId, null);
}

/**
 * Revokes a share link. Only the creator may revoke it.
 */
export async function revokeShareLink(token: string, dbUserId: string): Promise<void> {
  await db
    .update(sharedLinks)
    .set({ isActive: false, revokedAt: new Date() })
    .where(and(eq(sharedLinks.token, token), eq(sharedLinks.createdBy, dbUserId)));
}
