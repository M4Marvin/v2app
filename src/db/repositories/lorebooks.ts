import { and, asc, count, eq, sql } from "drizzle-orm";
import { db as defaultDb, type DB } from "@/db";
import {
  lorebooks,
  loreEntries,
  type Lorebook,
  type LoreEntry,
  type NewLorebook,
  type NewLoreEntry,
} from "@/db/schema";
import type { LoreConfig, LoreEntry as LoreEntryData } from "@/lib/st-core/lorebook";

export type CreateLorebookInput = {
  id: string;
  name: string;
  description?: string | null;
  config: LoreConfig;
};

export type LorebookWithCount = Omit<Lorebook, "enabled"> & {
  entryCount: number;
  // Single-user activation flag, stored directly on the lorebook row.
  enabled: boolean;
};

export type LoreEntryWithUserState = Omit<LoreEntry, "userDisabled"> & {
  // Single-user disable flag, stored directly on the entry row.
  // AND semantics with the entry's own data.disable.
  userDisabled: boolean;
};

export type CreateLoreEntryInput = {
  id: string;
  lorebookId: string;
  uid: number;
  data: LoreEntryData;
};

export function listLorebooks(db: DB = defaultDb): LorebookWithCount[] {
  const rows = db
    .select({
      lorebook: lorebooks,
      entryCount: count(loreEntries.id),
    })
    .from(lorebooks)
    .leftJoin(loreEntries, eq(loreEntries.lorebookId, lorebooks.id))
    .groupBy(lorebooks.id)
    .orderBy(asc(lorebooks.name))
    .all();
  return rows.map((r) => ({
    ...r.lorebook,
    entryCount: r.entryCount,
    enabled: r.lorebook.enabled === 1,
  }));
}

export function getLorebook(id: string, db: DB = defaultDb): Lorebook {
  const row = db.select().from(lorebooks).where(eq(lorebooks.id, id)).get();
  if (!row) throw new Error("Lorebook not found");
  return row;
}

export function createLorebook(input: CreateLorebookInput, db: DB = defaultDb): Lorebook {
  const now = new Date();
  const row = db
    .insert(lorebooks)
    .values({
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      config: input.config,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  if (!row) throw new Error("Failed to create lorebook");
  return row;
}

export function updateLorebook(
  id: string,
  patch: Partial<Pick<NewLorebook, "name" | "description" | "config">>,
  db: DB = defaultDb,
): Lorebook {
  const row = db
    .update(lorebooks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(lorebooks.id, id))
    .returning()
    .get();
  if (!row) throw new Error("Lorebook not found");
  return row;
}

export function deleteLorebook(id: string, db: DB = defaultDb): void {
  // Manual cascade: FK enforcement is off in dev.db.
  db.delete(loreEntries).where(eq(loreEntries.lorebookId, id)).run();
  const result = db.delete(lorebooks).where(eq(lorebooks.id, id)).run();
  if (result.changes === 0) throw new Error("Lorebook not found");
}

export function listEntries(lorebookId: string, db: DB = defaultDb): LoreEntryWithUserState[] {
  getLorebook(lorebookId, db);
  const rows = db
    .select()
    .from(loreEntries)
    .where(eq(loreEntries.lorebookId, lorebookId))
    .orderBy(asc(loreEntries.uid))
    .all();
  return rows.map((r) => ({ ...r, userDisabled: r.userDisabled === 1 }));
}

export function getEntry(lorebookId: string, entryId: string, db: DB = defaultDb): LoreEntry {
  getLorebook(lorebookId, db);
  const row = db
    .select()
    .from(loreEntries)
    .where(and(eq(loreEntries.id, entryId), eq(loreEntries.lorebookId, lorebookId)))
    .get();
  if (!row) throw new Error("Lore entry not found");
  return row;
}

export function createEntry(input: CreateLoreEntryInput, db: DB = defaultDb): LoreEntry {
  getLorebook(input.lorebookId, db);
  const now = new Date();
  const row = db
    .insert(loreEntries)
    .values({
      id: input.id,
      lorebookId: input.lorebookId,
      uid: input.uid,
      data: input.data,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  if (!row) throw new Error("Failed to create lore entry");
  return row;
}

export function updateEntry(
  lorebookId: string,
  entryId: string,
  patch: Partial<Pick<NewLoreEntry, "uid" | "data">>,
  db: DB = defaultDb,
): LoreEntry {
  getLorebook(lorebookId, db);
  const row = db
    .update(loreEntries)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(loreEntries.id, entryId), eq(loreEntries.lorebookId, lorebookId)))
    .returning()
    .get();
  if (!row) throw new Error("Lore entry not found");
  return row;
}

export function deleteEntry(lorebookId: string, entryId: string, db: DB = defaultDb): void {
  getLorebook(lorebookId, db);
  const result = db
    .delete(loreEntries)
    .where(and(eq(loreEntries.id, entryId), eq(loreEntries.lorebookId, lorebookId)))
    .run();
  if (result.changes === 0) throw new Error("Lore entry not found");
}

export function nextEntryUid(lorebookId: string, db: DB = defaultDb): number {
  getLorebook(lorebookId, db);
  const row = db
    .select({ max: sql<number>`COALESCE(MAX(${loreEntries.uid}), 0)` })
    .from(loreEntries)
    .where(eq(loreEntries.lorebookId, lorebookId))
    .get();
  return (row?.max ?? 0) + 1;
}

// ── Lorebook activation (stored on `lorebooks.enabled`) ─────────────────────

export function isLorebookEnabled(lorebookId: string, db: DB = defaultDb): boolean {
  const row = db
    .select({ id: lorebooks.id })
    .from(lorebooks)
    .where(and(eq(lorebooks.id, lorebookId), eq(lorebooks.enabled, 1)))
    .get();
  return row !== undefined;
}

export function listEnabledLorebookIds(db: DB = defaultDb): string[] {
  return db
    .select({ id: lorebooks.id })
    .from(lorebooks)
    .where(eq(lorebooks.enabled, 1))
    .all()
    .map((r) => r.id);
}

export function setLorebookEnabled(lorebookId: string, enabled: boolean, db: DB = defaultDb): void {
  db.update(lorebooks)
    .set({ enabled: enabled ? 1 : 0 })
    .where(eq(lorebooks.id, lorebookId))
    .run();
}

// ── Entry disable flag (stored on `lore_entries.user_disabled`) ──────────────

export function isEntryUserDisabled(entryId: string, db: DB = defaultDb): boolean {
  const row = db
    .select({ id: loreEntries.id })
    .from(loreEntries)
    .where(and(eq(loreEntries.id, entryId), eq(loreEntries.userDisabled, 1)))
    .get();
  return row !== undefined;
}

export function listUserDisabledEntryIds(db: DB = defaultDb): string[] {
  return db
    .select({ id: loreEntries.id })
    .from(loreEntries)
    .where(eq(loreEntries.userDisabled, 1))
    .all()
    .map((r) => r.id);
}

export function setLoreEntryDisabled(
  entryId: string,
  disabled: boolean,
  db: DB = defaultDb,
): void {
  db.update(loreEntries)
    .set({ userDisabled: disabled ? 1 : 0 })
    .where(eq(loreEntries.id, entryId))
    .run();
}
