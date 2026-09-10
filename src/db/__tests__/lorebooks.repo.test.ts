import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createEntry,
  createLorebook,
  deleteEntry,
  deleteLorebook,
  getEntry,
  getLorebook,
  isEntryUserDisabled,
  isLorebookEnabled,
  listEnabledLorebookIds,
  listEntries,
  listLorebooks,
  listUserDisabledEntryIds,
  nextEntryUid,
  setLoreEntryDisabled,
  setLorebookEnabled,
  updateEntry,
  updateLorebook,
} from "@/db/repositories/lorebooks";
import { makeLoreEntry, makeLorebookConfig } from "@/db/__tests__/lorebook-data";
import { makeTestDb, type TestDb } from "@/db/__tests__/helpers";

describe("lorebooks repository", () => {
  let db: TestDb;

  let ctx: ReturnType<typeof makeTestDb>;

  beforeEach(() => {
    ctx = makeTestDb();
    db = ctx.db;
  });

  afterEach(() => {
    ctx.sqlite.close();
  });

  describe("createLorebook", () => {
    it("inserts a row with required fields and returns it", () => {
      const row = createLorebook(
        {
          id: "lb-1",
          name: "World Guide",
          config: makeLorebookConfig(),
        },
        db,
      );
      expect(row.id).toBe("lb-1");
      expect(row.name).toBe("World Guide");
      expect(row.description).toBeNull();
      expect(row.config).toEqual(makeLorebookConfig());
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.updatedAt).toBeInstanceOf(Date);
    });

    it("stores description when provided", () => {
      const row = createLorebook(
        {
          id: "lb-1",
          name: "X",
          description: "A description",
          config: makeLorebookConfig(),
        },
        db,
      );
      expect(row.description).toBe("A description");
    });

    it("round-trips config JSON", () => {
      const config = makeLorebookConfig({ depth: 8, scanDepth: 25 });
      createLorebook({ id: "lb-1", name: "X", config }, db);
      const fetched = getLorebook("lb-1", db);
      expect(fetched.config).toEqual(config);
    });
  });

  describe("getLorebook", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
    });

    it("returns the lorebook by id", () => {
      const row = getLorebook("lb-1", db);
      expect(row.id).toBe("lb-1");
    });

    it("throws when id does not exist", () => {
      expect(() => getLorebook("missing", db)).toThrow("Lorebook not found");
    });
  });

  describe("listLorebooks", () => {
    it("returns an empty array when there are no lorebooks", () => {
      expect(listLorebooks(db)).toEqual([]);
    });

    it("orders lorebooks by name", () => {
      createLorebook({ id: "lb-1", name: "Bravo", config: makeLorebookConfig() }, db);
      createLorebook({ id: "lb-2", name: "Alpha", config: makeLorebookConfig() }, db);
      const all = listLorebooks(db);
      expect(all).toHaveLength(2);
      expect(all.map((l) => l.name)).toEqual(["Alpha", "Bravo"]);
    });

    it("includes entry count via left join", () => {
      createLorebook({ id: "lb-1", name: "Has entries", config: makeLorebookConfig() }, db);
      createLorebook({ id: "lb-2", name: "Empty", config: makeLorebookConfig() }, db);
      const entry = makeLoreEntry({ uid: 1 });
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: entry }, db);
      createEntry({ id: "e-2", lorebookId: "lb-1", uid: 2, data: { ...entry, uid: 2 } }, db);
      const list = listLorebooks(db);
      const withEntries = list.find((l) => l.id === "lb-1");
      const empty = list.find((l) => l.id === "lb-2");
      expect(withEntries?.entryCount).toBe(2);
      expect(empty?.entryCount).toBe(0);
    });
  });

  describe("updateLorebook", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "Old", config: makeLorebookConfig() }, db);
    });

    it("applies a partial patch and bumps updatedAt", async () => {
      const before = getLorebook("lb-1", db);
      await new Promise((r) => setTimeout(r, 5));
      const updated = updateLorebook("lb-1", { name: "New" }, db);
      expect(updated.name).toBe("New");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    });

    it("updates config with new JSON", () => {
      const newConfig = makeLorebookConfig({ depth: 8 });
      const updated = updateLorebook("lb-1", { config: newConfig }, db);
      expect(updated.config).toEqual(newConfig);
    });

    it("throws when lorebook does not exist", () => {
      expect(() => updateLorebook("missing", { name: "x" }, db)).toThrow("Lorebook not found");
    });
  });

  describe("deleteLorebook", () => {
    it("removes the row", () => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      deleteLorebook("lb-1", db);
      expect(() => getLorebook("lb-1", db)).toThrow("Lorebook not found");
    });

    it("cascades and removes entries", () => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      const entry = makeLoreEntry({ uid: 1 });
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: entry }, db);
      deleteLorebook("lb-1", db);
      expect(() => listEntries("lb-1", db)).toThrow("Lorebook not found");
    });

    it("throws when lorebook does not exist", () => {
      expect(() => deleteLorebook("missing", db)).toThrow("Lorebook not found");
    });
  });

  describe("createEntry", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
    });

    it("inserts a row with all fields and returns it", () => {
      const data = makeLoreEntry({ uid: 1, comment: "First" });
      const row = createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data }, db);
      expect(row.id).toBe("e-1");
      expect(row.lorebookId).toBe("lb-1");
      expect(row.uid).toBe(1);
      expect(row.data).toEqual(data);
    });

    it("throws when the lorebook does not exist", () => {
      const data = makeLoreEntry({ uid: 1 });
      expect(() => createEntry({ id: "e-1", lorebookId: "missing", uid: 1, data }, db)).toThrow(
        "Lorebook not found",
      );
    });
  });

  describe("getEntry", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      const data = makeLoreEntry({ uid: 1 });
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data }, db);
    });

    it("returns the entry for the owning lorebook", () => {
      const row = getEntry("lb-1", "e-1", db);
      expect(row.id).toBe("e-1");
    });

    it("throws when entry does not exist", () => {
      expect(() => getEntry("lb-1", "missing", db)).toThrow("Lore entry not found");
    });

    it("throws when entry belongs to another lorebook", () => {
      createLorebook({ id: "lb-2", name: "Y", config: makeLorebookConfig() }, db);
      expect(() => getEntry("lb-2", "e-1", db)).toThrow("Lore entry not found");
    });

    it("throws when the lorebook does not exist", () => {
      expect(() => getEntry("missing", "e-1", db)).toThrow("Lorebook not found");
    });
  });

  describe("listEntries", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
    });

    it("returns an empty array when lorebook has no entries", () => {
      expect(listEntries("lb-1", db)).toEqual([]);
    });

    it("returns entries ordered by uid", () => {
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 3, data: makeLoreEntry({ uid: 3 }) }, db);
      createEntry({ id: "e-2", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      createEntry({ id: "e-3", lorebookId: "lb-1", uid: 2, data: makeLoreEntry({ uid: 2 }) }, db);
      const list = listEntries("lb-1", db);
      expect(list.map((e) => e.uid)).toEqual([1, 2, 3]);
    });

    it("throws when the lorebook does not exist", () => {
      expect(() => listEntries("missing", db)).toThrow("Lorebook not found");
    });
  });

  describe("updateEntry", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      const data = makeLoreEntry({ uid: 1, comment: "Old" });
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data }, db);
    });

    it("applies a partial patch", () => {
      const newData = makeLoreEntry({ uid: 1, comment: "New" });
      const updated = updateEntry("lb-1", "e-1", { data: newData }, db);
      expect(updated.data).toEqual(newData);
    });

    it("changes uid", () => {
      const newData = makeLoreEntry({ uid: 5 });
      const updated = updateEntry("lb-1", "e-1", { uid: 5, data: newData }, db);
      expect(updated.uid).toBe(5);
    });

    it("throws when entry does not exist", () => {
      expect(() => updateEntry("lb-1", "missing", { data: makeLoreEntry() }, db)).toThrow(
        "Lore entry not found",
      );
    });

    it("throws when entry belongs to another lorebook", () => {
      createLorebook({ id: "lb-2", name: "Y", config: makeLorebookConfig() }, db);
      expect(() => updateEntry("lb-2", "e-1", { data: makeLoreEntry() }, db)).toThrow(
        "Lore entry not found",
      );
    });
  });

  describe("deleteEntry", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
    });

    it("removes the row", () => {
      deleteEntry("lb-1", "e-1", db);
      expect(() => getEntry("lb-1", "e-1", db)).toThrow("Lore entry not found");
    });

    it("throws when entry does not exist", () => {
      expect(() => deleteEntry("lb-1", "missing", db)).toThrow("Lore entry not found");
    });

    it("throws when entry belongs to another lorebook", () => {
      createLorebook({ id: "lb-2", name: "Y", config: makeLorebookConfig() }, db);
      expect(() => deleteEntry("lb-2", "e-1", db)).toThrow("Lore entry not found");
    });
  });

  describe("nextEntryUid", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
    });

    it("returns 1 when lorebook is empty", () => {
      expect(nextEntryUid("lb-1", db)).toBe(1);
    });

    it("returns max + 1", () => {
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      createEntry({ id: "e-2", lorebookId: "lb-1", uid: 5, data: makeLoreEntry({ uid: 5 }) }, db);
      expect(nextEntryUid("lb-1", db)).toBe(6);
    });

    it("throws when the lorebook does not exist", () => {
      expect(() => nextEntryUid("missing", db)).toThrow("Lorebook not found");
    });
  });

  // ── Activation flags, stored as columns on the lorebook/entry rows ─────────

  describe("lorebook activation (enabled column)", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
    });

    it("defaults to disabled", () => {
      expect(isLorebookEnabled("lb-1", db)).toBe(false);
    });

    it("enabling sets the column so isLorebookEnabled returns true", () => {
      setLorebookEnabled("lb-1", true, db);
      expect(isLorebookEnabled("lb-1", db)).toBe(true);
    });

    it("disabling clears the column", () => {
      setLorebookEnabled("lb-1", true, db);
      setLorebookEnabled("lb-1", false, db);
      expect(isLorebookEnabled("lb-1", db)).toBe(false);
    });

    it("enabling twice is a no-op", () => {
      setLorebookEnabled("lb-1", true, db);
      expect(() => setLorebookEnabled("lb-1", true, db)).not.toThrow();
      expect(isLorebookEnabled("lb-1", db)).toBe(true);
    });

    it("disabling twice is a no-op", () => {
      setLorebookEnabled("lb-1", false, db);
      expect(() => setLorebookEnabled("lb-1", false, db)).not.toThrow();
      expect(isLorebookEnabled("lb-1", db)).toBe(false);
    });

    it("reports false for a lorebook that does not exist", () => {
      expect(isLorebookEnabled("missing", db)).toBe(false);
    });
  });

  describe("listEnabledLorebookIds", () => {
    it("returns empty when nothing is enabled", () => {
      createLorebook({ id: "lb-1", name: "A", config: makeLorebookConfig() }, db);
      createLorebook({ id: "lb-2", name: "B", config: makeLorebookConfig() }, db);
      expect(listEnabledLorebookIds(db)).toEqual([]);
    });

    it("returns only the enabled ids", () => {
      createLorebook({ id: "lb-1", name: "A", config: makeLorebookConfig() }, db);
      createLorebook({ id: "lb-2", name: "B", config: makeLorebookConfig() }, db);
      setLorebookEnabled("lb-2", true, db);
      expect(listEnabledLorebookIds(db)).toEqual(["lb-2"]);
    });

    it("re-enabling and disabling updates the list", () => {
      createLorebook({ id: "lb-1", name: "A", config: makeLorebookConfig() }, db);
      setLorebookEnabled("lb-1", true, db);
      expect(listEnabledLorebookIds(db)).toEqual(["lb-1"]);
      setLorebookEnabled("lb-1", false, db);
      expect(listEnabledLorebookIds(db)).toEqual([]);
    });
  });

  describe("entry disable flag (user_disabled column)", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
    });

    it("defaults to not disabled", () => {
      expect(isEntryUserDisabled("e-1", db)).toBe(false);
    });

    it("disabling sets the flag", () => {
      setLoreEntryDisabled("e-1", true, db);
      expect(isEntryUserDisabled("e-1", db)).toBe(true);
    });

    it("re-enabling clears the flag", () => {
      setLoreEntryDisabled("e-1", true, db);
      setLoreEntryDisabled("e-1", false, db);
      expect(isEntryUserDisabled("e-1", db)).toBe(false);
    });
  });

  describe("listUserDisabledEntryIds", () => {
    beforeEach(() => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
    });

    it("returns only the disabled entries", () => {
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      createEntry({ id: "e-2", lorebookId: "lb-1", uid: 2, data: makeLoreEntry({ uid: 2 }) }, db);
      setLoreEntryDisabled("e-1", true, db);
      expect(listUserDisabledEntryIds(db)).toEqual(["e-1"]);
    });

    it("returns empty when nothing is disabled", () => {
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      expect(listUserDisabledEntryIds(db)).toEqual([]);
    });
  });

  describe("listLorebooks enabled state", () => {
    it("reflects the enabled column", () => {
      createLorebook({ id: "lb-1", name: "A", config: makeLorebookConfig() }, db);
      createLorebook({ id: "lb-2", name: "B", config: makeLorebookConfig() }, db);
      setLorebookEnabled("lb-1", true, db);
      const list = listLorebooks(db);
      const a = list.find((l) => l.id === "lb-1");
      const b = list.find((l) => l.id === "lb-2");
      expect(a?.enabled).toBe(true);
      expect(b?.enabled).toBe(false);
    });
  });

  describe("listEntries userDisabled state", () => {
    it("reflects the user_disabled column", () => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      createEntry({ id: "e-2", lorebookId: "lb-1", uid: 2, data: makeLoreEntry({ uid: 2 }) }, db);
      setLoreEntryDisabled("e-1", true, db);
      const list = listEntries("lb-1", db);
      const e1 = list.find((e) => e.id === "e-1");
      const e2 = list.find((e) => e.id === "e-2");
      expect(e1?.userDisabled).toBe(true);
      expect(e2?.userDisabled).toBe(false);
    });
  });

  describe("activation state clears with the row", () => {
    it("deleting a lorebook removes its enabled state", () => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      setLorebookEnabled("lb-1", true, db);
      setLoreEntryDisabled("e-1", true, db);
      expect(isLorebookEnabled("lb-1", db)).toBe(true);
      expect(isEntryUserDisabled("e-1", db)).toBe(true);

      deleteLorebook("lb-1", db);

      expect(isLorebookEnabled("lb-1", db)).toBe(false);
      expect(isEntryUserDisabled("e-1", db)).toBe(false);
    });

    it("deleting an entry removes its disabled state", () => {
      createLorebook({ id: "lb-1", name: "X", config: makeLorebookConfig() }, db);
      createEntry({ id: "e-1", lorebookId: "lb-1", uid: 1, data: makeLoreEntry({ uid: 1 }) }, db);
      setLoreEntryDisabled("e-1", true, db);
      expect(isEntryUserDisabled("e-1", db)).toBe(true);

      deleteEntry("lb-1", "e-1", db);

      expect(isEntryUserDisabled("e-1", db)).toBe(false);
    });
  });
});
