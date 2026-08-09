import { describe, expect, it } from "vitest";
import { convertCharacterBookToStandalone } from "@/lib/lorebook/embedded-book";
import { DEFAULT_LORE_CONFIG } from "@/lib/st-core/lorebook";
import type { CharacterBook, CharacterBookEntry } from "@/lib/st-core/character/types";

function makeValidEntry(overrides: Record<string, unknown> = {}): CharacterBookEntry {
  return {
    id: 1,
    keys: ["dragon", "wyrm"],
    secondary_keys: [],
    comment: "A dragon lore entry",
    content: "Dragons are ancient creatures.",
    constant: false,
    selective: false,
    insertion_order: 100,
    enabled: true,
    position: "before_char",
    extensions: {
      position: 0,
      exclude_recursion: false,
      prevent_recursion: false,
      delay_until_recursion: false,
      depth: 4,
      selectiveLogic: 0,
      group: "",
      group_override: false,
      group_weight: 100,
      probability: 100,
      useProbability: true,
      automation_id: "",
      role: 0,
      triggers: [],
      ignore_budget: false,
    },
    ...overrides,
  } as CharacterBookEntry;
}

function makeValidBook(overrides: Record<string, unknown> = {}): CharacterBook {
  return {
    name: "Book Guide",
    description: "A test book",
    extensions: {},
    entries: [
      makeValidEntry({ id: 1 }),
      makeValidEntry({ id: 2, keys: ["other"], content: "Other" }),
    ],
    ...overrides,
  } as CharacterBook;
}

describe("convertCharacterBookToStandalone", () => {
  it("maps embedded book entries to lore entries (order, position, disable, uid)", () => {
    const result = convertCharacterBookToStandalone(makeValidBook(), "Fallback");

    expect(result.entries).toHaveLength(2);
    const first = result.entries[0];
    expect(first?.uid).toBe(1);
    expect(first?.key).toEqual(["dragon", "wyrm"]);
    expect(first?.keysecondary).toEqual([]);
    expect(first?.comment).toBe("A dragon lore entry");
    expect(first?.content).toBe("Dragons are ancient creatures.");
    expect(first?.order).toBe(100);
    expect(first?.position).toBe(0);
    expect(first?.disable).toBe(false);
    expect(first?.selective).toBe(false);
    expect(first?.constant).toBe(false);

    const second = result.entries[1];
    expect(second?.uid).toBe(2);
    expect(second?.key).toEqual(["other"]);
  });

  it("takes position from extensions.position and inverts enabled into disable", () => {
    const result = convertCharacterBookToStandalone(
      makeValidBook({
        entries: [
          makeValidEntry({
            id: 1,
            position: "before_char",
            enabled: false,
            insertion_order: 77,
            extensions: { position: 1 },
          }),
        ],
      }),
      "Fallback",
    );

    const entry = result.entries[0];
    expect(entry?.position).toBe(1); // extensions.position wins over top-level
    expect(entry?.disable).toBe(true); // enabled: false → disable: true
    expect(entry?.order).toBe(77);
  });

  it("assigns sequential uids when entries have no id", () => {
    const result = convertCharacterBookToStandalone(
      makeValidBook({
        entries: [
          makeValidEntry({ id: undefined, keys: ["a"], content: "A" }),
          makeValidEntry({ id: undefined, keys: ["b"], content: "B" }),
        ],
      }),
      "Fallback",
    );

    expect(result.entries.map((e) => e.uid)).toEqual([1, 2]);
  });

  it("advances fallback uid past explicit ids to avoid collisions", () => {
    const result = convertCharacterBookToStandalone(
      makeValidBook({
        entries: [
          makeValidEntry({ id: 5, keys: ["a"], content: "A" }),
          makeValidEntry({ id: undefined, keys: ["b"], content: "B" }),
        ],
      }),
      "Fallback",
    );

    expect(result.entries.map((e) => e.uid)).toEqual([5, 6]);
  });

  it("converts entries with empty keys, preserving the empty array", () => {
    const result = convertCharacterBookToStandalone(
      makeValidBook({
        entries: [makeValidEntry({ id: undefined, keys: [], content: "Keyless" })],
      }),
      "Fallback",
    );

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.key).toEqual([]);
    expect(result.entries[0]?.uid).toBe(1);
  });

  it("falls back to '<fallbackName> [embedded]' when name is missing or empty", () => {
    const fallback = convertCharacterBookToStandalone(makeValidBook({ name: undefined }), "Alice");
    expect(fallback.name).toBe("Alice [embedded]");

    const blank = convertCharacterBookToStandalone(makeValidBook({ name: "   " }), "Alice");
    expect(blank.name).toBe("Alice [embedded]");
  });

  it("uses the book name when present", () => {
    const result = convertCharacterBookToStandalone(
      makeValidBook({ name: "  Real Book  " }),
      "Alice",
    );
    expect(result.name).toBe("Real Book");
  });

  it("uses null description when missing or empty", () => {
    expect(
      convertCharacterBookToStandalone(makeValidBook({ description: undefined }), "Alice")
        .description,
    ).toBeNull();
    expect(
      convertCharacterBookToStandalone(makeValidBook({ description: "   " }), "Alice").description,
    ).toBeNull();
    expect(
      convertCharacterBookToStandalone(makeValidBook({ description: "A book" }), "Alice")
        .description,
    ).toBe("A book");
  });

  it("returns DEFAULT_LORE_CONFIG as config", () => {
    const result = convertCharacterBookToStandalone(makeValidBook(), "Alice");
    expect(result.config).toEqual(DEFAULT_LORE_CONFIG);
  });

  it("skips and counts entries that fail LoreEntrySchema (content missing)", () => {
    const broken = makeValidEntry({ id: 1, keys: ["a"] }) as unknown as Record<string, unknown>;
    delete broken.content;

    const result = convertCharacterBookToStandalone(
      makeValidBook({
        entries: [
          broken as unknown as CharacterBookEntry,
          makeValidEntry({ id: 2, keys: ["ok"], content: "Fine" }),
        ],
      }),
      "Alice",
    );

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.uid).toBe(2);
    expect(result.entriesSkipped).toBe(1);
  });

  it("emits duplicate uids when two entries share the same explicit id", () => {
    const result = convertCharacterBookToStandalone(
      makeValidBook({
        entries: [
          makeValidEntry({ id: 3, keys: ["a"], content: "A" }),
          makeValidEntry({ id: 3, keys: ["b"], content: "B" }),
        ],
      }),
      "Alice",
    );

    expect(result.entries.map((e) => e.uid)).toEqual([3, 3]);
    expect(result.entriesSkipped).toBe(0);
  });

  it("returns empty entries and zero skipped for an empty book", () => {
    const result = convertCharacterBookToStandalone(makeValidBook({ entries: [] }), "Alice");
    expect(result.entries).toEqual([]);
    expect(result.entriesSkipped).toBe(0);
  });

  it("never throws for malformed input shapes", () => {
    const fallback = convertCharacterBookToStandalone(
      { entries: [null, "not an object", 42] } as unknown as CharacterBook,
      "Alice",
    );
    expect(fallback.entries).toEqual([]);
    expect(fallback.entriesSkipped).toBe(3);

    const noEntries = convertCharacterBookToStandalone({} as CharacterBook, "Alice");
    expect(noEntries.entries).toEqual([]);
    expect(noEntries.entriesSkipped).toBe(0);

    const nullBook = convertCharacterBookToStandalone(null as unknown as CharacterBook, "Alice");
    expect(nullBook.entries).toEqual([]);
    expect(nullBook.name).toBe("Alice [embedded]");
  });
});
