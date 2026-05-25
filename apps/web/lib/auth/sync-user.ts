import { auth, currentUser } from '@clerk/nextjs/server';
import { db, users, eq } from '@carcheck/db';

/**
 * Ensures the currently authenticated Clerk user has a corresponding row in our
 * `users` table. Returns the DB user id for use as a foreign key.
 *
 * Idempotent — safe to call from any auth'd request.
 */
export async function syncCurrentUser(): Promise<{ dbUserId: string; clerkUserId: string } | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, existing[0].id));
    return { dbUserId: existing[0].id, clerkUserId };
  }

  const clerk = await currentUser();
  if (!clerk) return null;

  const email = clerk.primaryEmailAddress?.emailAddress ?? clerk.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error('Clerk user has no email — cannot sync to CarCheck users table');
  }

  const inserted = await db
    .insert(users)
    .values({
      clerkUserId,
      email,
      firstName: clerk.firstName,
      lastName: clerk.lastName,
      phone: clerk.primaryPhoneNumber?.phoneNumber,
      lastLoginAt: new Date(),
    })
    .returning({ id: users.id });

  const dbUserId = inserted[0]?.id;
  if (!dbUserId) throw new Error('Failed to insert user');
  return { dbUserId, clerkUserId };
}

export async function requireDbUser(): Promise<{ dbUserId: string; clerkUserId: string }> {
  const user = await syncCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
