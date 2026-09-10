import { db as defaultDb, type DB } from "@/db";
import type { LoreEntry } from "@/lib/st-core/lorebook/types";
import {
  listEnabledLorebookIds,
  listUserDisabledEntryIds,
  listEntries as repoListEntries,
} from "@/db/repositories/lorebooks";

export function getEnabledLoreEntries(db: DB = defaultDb): LoreEntry[] {
  try {
    const enabledIds = listEnabledLorebookIds(db);
    if (enabledIds.length === 0) return [];

    const disabled = new Set(listUserDisabledEntryIds(db));
    const entries: LoreEntry[] = [];
    for (const lbId of enabledIds) {
      const lbEntries = repoListEntries(lbId, db);
      for (const e of lbEntries) {
        if (disabled.has(e.id)) continue;
        if (e.data.disable ?? false) continue;
        entries.push(e.data);
      }
    }
    return entries;
  } catch {
    return [];
  }
}
