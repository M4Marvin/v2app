import { type } from "arktype";
import {
  DEFAULT_LORE_CONFIG,
  LoreEntrySchema,
  type LoreConfig,
  type LoreEntry,
} from "@/lib/st-core/lorebook";
import type { CharacterBook, CharacterBookEntry } from "@/lib/st-core/character/types";

// Convert a character card's embedded `character_book` into a standalone
// lorebook shape, ready for insertion into the lorebooks + lore_entries
// tables (mirrors `parseWorldFile` for .json world-info files).
//
// Field mapping follows `convertBookEntries` in `src/lib/chat/lorebook.ts`
// (chat runtime): extension fields live under `extensions.*`, `enabled` is
// inverted into `disable`, `position` is `0 | 1` (LorePosition enum).
// The one deliberate difference: uids are NOT `id ?? 0` — each entry gets a
// unique uid within the book (the DB enforces a unique index on
// (lorebook_id, uid)), allocating fresh sequential uids past any explicit
// numeric `id`. Two source entries carrying the SAME explicit id both keep
// that uid — the importer's per-entry collision catch absorbs duplicates;
// this converter documents the behavior rather than deduping.

export interface StandaloneBookResult {
  name: string;
  description: string | null;
  config: LoreConfig;
  entries: LoreEntry[];
  entriesSkipped: number;
}

function mapBookEntry(entry: CharacterBookEntry, uid: number): LoreEntry {
  return {
    uid,
    key: entry.keys,
    keysecondary: entry.secondary_keys ?? [],
    comment: entry.comment ?? "",
    content: entry.content,
    constant: entry.constant ?? false,
    selective: entry.selective ?? false,
    order: entry.insertion_order ?? 100,
    position: (entry.extensions?.position ?? (entry.position === "before_char" ? 0 : 1)) as 0 | 1,
    disable: !(entry.enabled ?? true),
    excludeRecursion: entry.extensions?.exclude_recursion ?? false,
    preventRecursion: entry.extensions?.prevent_recursion ?? false,
    delayUntilRecursion: entry.extensions?.delay_until_recursion ?? false,
    depth: entry.extensions?.depth ?? 0,
    selectiveLogic: entry.extensions?.selectiveLogic ?? 0,
    group: entry.extensions?.group ?? "",
    groupOverride: entry.extensions?.group_override ?? false,
    groupWeight: entry.extensions?.group_weight ?? 0,
    probability: entry.extensions?.probability ?? 100,
    useProbability: entry.extensions?.useProbability ?? true,
    scanDepth: null,
    caseSensitive: null,
    matchWholeWords: null,
    useGroupScoring: null,
    automationId: entry.extensions?.automation_id ?? "",
    role: entry.extensions?.role ?? 0,
    vectorized: false,
    sticky: null,
    cooldown: null,
    delay: null,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    triggers: entry.extensions?.triggers ?? [],
    ignoreBudget: entry.extensions?.ignore_budget ?? false,
  };
}

export function convertCharacterBookToStandalone(
  book: CharacterBook,
  fallbackName: string,
): StandaloneBookResult {
  // Never throw for malformed input: coerce the book to a safe shape first.
  const safe: {
    name?: unknown;
    description?: unknown;
    entries?: CharacterBookEntry[];
  } = book && typeof book === "object" ? book : {};

  const trimmedName = typeof safe.name === "string" ? safe.name.trim() : "";
  const name = trimmedName.length > 0 ? trimmedName : `${fallbackName.trim()} [embedded]`;

  const trimmedDescription = typeof safe.description === "string" ? safe.description.trim() : "";
  const description = trimmedDescription.length > 0 ? trimmedDescription : null;

  const config: LoreConfig = { ...DEFAULT_LORE_CONFIG };

  const entries: LoreEntry[] = [];
  let entriesSkipped = 0;
  let nextUid = 1;

  if (Array.isArray(safe.entries)) {
    for (const raw of safe.entries) {
      if (!raw || typeof raw !== "object") {
        entriesSkipped++;
        continue;
      }
      const uid =
        typeof raw.id === "number" && Number.isInteger(raw.id) && raw.id >= 0 ? raw.id : nextUid;
      const entry = mapBookEntry(raw, uid);
      const result = LoreEntrySchema(entry);
      if (result instanceof type.errors) {
        entriesSkipped++;
        continue;
      }
      // Advance nextUid past this entry's uid so the next fallback doesn't collide.
      nextUid = Math.max(nextUid, uid + 1);
      entries.push(entry);
    }
  }

  return { name, description, config, entries, entriesSkipped };
}
