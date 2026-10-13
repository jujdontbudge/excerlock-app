import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { complimentaryAccessAudit, complimentaryAccessGrants, getDb, users } from "../../db/index.js";
import type { AdaptyEnvironment } from "../../db/schema.js";

export function normalizeAccessEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Enter a valid email address");
  return normalized;
}

export function createComplimentaryAccessRepository(database = getDb()) {
  if (!database) throw new Error("Complimentary access requires DATABASE_URL");
  const db = database;
  const active = (email: string, environment: AdaptyEnvironment) => and(eq(complimentaryAccessGrants.email, email), eq(complimentaryAccessGrants.environment, environment), isNull(complimentaryAccessGrants.revokedAt));
  return {
    async grant(input: { email: string; environment: AdaptyEnvironment; actor: string; note: string; expiresAt: Date | null }, now = new Date()) {
      const email = normalizeAccessEmail(input.email);
      if (!input.note.trim() || input.note.length > 1000 || !input.actor.trim() || input.actor.length > 200) throw new Error("Grant needs an actor and a note (up to 1000 characters)");
      if (input.expiresAt && (!Number.isFinite(input.expiresAt.getTime()) || input.expiresAt <= now)) throw new Error("Grant expiry must be in the future");
      return db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.environment + ":" + email}))`);
        const replaced = await tx.update(complimentaryAccessGrants).set({ revokedAt: now, revokedBy: input.actor }).where(active(email, input.environment)).returning({ id: complimentaryAccessGrants.id });
        for (const row of replaced) await tx.insert(complimentaryAccessAudit).values({ id: randomUUID(), grantId: row.id, action: "revoke", actor: input.actor, occurredAt: now, note: "Replaced by a new grant" });
        const [grant] = await tx.insert(complimentaryAccessGrants).values({ id: randomUUID(), email, environment: input.environment, grantedBy: input.actor, grantedAt: now, note: input.note, expiresAt: input.expiresAt }).returning();
        await tx.insert(complimentaryAccessAudit).values({ id: randomUUID(), grantId: grant!.id, action: "grant", actor: input.actor, occurredAt: now, note: input.note, expiresAt: input.expiresAt });
        return grant!;
      });
    },
    async revoke(input: { email: string; environment: AdaptyEnvironment; actor: string; note: string }, now = new Date()) {
      const email = normalizeAccessEmail(input.email);
      if (!input.actor.trim() || input.actor.length > 200 || !input.note.trim() || input.note.length > 1000) throw new Error("Revoke needs an actor and a note");
      return db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.environment + ":" + email}))`);
        const rows = await tx.update(complimentaryAccessGrants).set({ revokedAt: now, revokedBy: input.actor }).where(active(email, input.environment)).returning({ id: complimentaryAccessGrants.id });
        for (const row of rows) await tx.insert(complimentaryAccessAudit).values({ id: randomUUID(), grantId: row.id, action: "revoke", actor: input.actor, occurredAt: now, note: input.note });
        return { revoked: rows.length };
      });
    },
    async list(environment: AdaptyEnvironment, email?: string) {
      return db.select().from(complimentaryAccessGrants).where(and(eq(complimentaryAccessGrants.environment, environment), email ? eq(complimentaryAccessGrants.email, normalizeAccessEmail(email)) : undefined)).orderBy(desc(complimentaryAccessGrants.grantedAt));
    },
    async read(userId: string, email: string, environment: AdaptyEnvironment, now: Date) {
      return db.transaction(async (tx) => {
        const [user] = await tx.select({ deletedAt: users.deletedAt }).from(users).where(eq(users.id, userId)).for("update").limit(1);
        if (!user || user.deletedAt) return null;
        const [grant] = await tx.select().from(complimentaryAccessGrants).where(active(normalizeAccessEmail(email), environment)).for("update").limit(1);
        if (!grant || (grant.expiresAt && grant.expiresAt <= now)) return null;
        await tx.update(complimentaryAccessGrants).set({ matchedUserId: userId }).where(eq(complimentaryAccessGrants.id, grant.id));
        return { grantedAt: grant.grantedAt, expiresAt: new Date(Math.min(grant.expiresAt?.getTime() ?? Infinity, now.getTime() + 24 * 60 * 60_000)) };
      });
    },
  };
}
