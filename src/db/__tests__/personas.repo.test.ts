import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/helpers";
import {
  createPersona,
  deletePersona,
  getPersona,
  listPersonas,
  updatePersona,
} from "@/db/repositories/personas";

describe("personas repository", () => {
  let db: TestDb;

  let ctx: ReturnType<typeof makeTestDb>;

  beforeEach(() => {
    ctx = makeTestDb();
    db = ctx.db;
  });

  afterEach(() => {
    ctx.sqlite.close();
  });

  describe("createPersona", () => {
    it("inserts a row with required fields and returns it", () => {
      const row = createPersona({ id: "p-1", name: "Default" }, db);
      expect(row.id).toBe("p-1");
      expect(row.name).toBe("Default");
      expect(row.description).toBeNull();
      expect(row.iconPath).toBeNull();
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.updatedAt).toBeInstanceOf(Date);
    });

    it("stores description and iconPath when provided", () => {
      const row = createPersona(
        {
          id: "p-1",
          name: "Alice",
          description: "A brave hero",
          iconPath: "uploads/personas/alice.png",
        },
        db,
      );
      expect(row.description).toBe("A brave hero");
      expect(row.iconPath).toBe("uploads/personas/alice.png");
    });
  });

  describe("getPersona", () => {
    it("throws when persona does not exist", () => {
      expect(() => getPersona("missing", db)).toThrow("Persona not found");
    });

    it("returns the persona by id", () => {
      createPersona({ id: "p-1", name: "X" }, db);
      expect(getPersona("p-1", db).id).toBe("p-1");
    });
  });

  describe("listPersonas", () => {
    it("returns an empty array when there are no personas", () => {
      expect(listPersonas(db)).toEqual([]);
    });

    it("returns personas ordered by name", () => {
      createPersona({ id: "p-1", name: "Bravo" }, db);
      createPersona({ id: "p-2", name: "Alpha" }, db);
      const all = listPersonas(db);
      expect(all).toHaveLength(2);
      expect(all.map((p) => p.name)).toEqual(["Alpha", "Bravo"]);
    });
  });

  describe("updatePersona", () => {
    beforeEach(() => {
      createPersona({ id: "p-1", name: "Old", description: "old desc" }, db);
    });

    it("updates name and description", () => {
      const updated = updatePersona("p-1", { name: "New", description: "new desc" }, db);
      expect(updated.name).toBe("New");
      expect(updated.description).toBe("new desc");
    });

    it("sets description to null when explicitly cleared", () => {
      const updated = updatePersona("p-1", { description: null }, db);
      expect(updated.description).toBeNull();
    });

    it("leaves untouched fields alone", () => {
      const updated = updatePersona("p-1", { name: "Renamed" }, db);
      expect(updated.description).toBe("old desc");
    });

    it("throws when persona does not exist", () => {
      expect(() => updatePersona("missing", { name: "X" }, db)).toThrow("Persona not found");
    });
  });

  describe("deletePersona", () => {
    it("removes the row", () => {
      createPersona({ id: "p-1", name: "X" }, db);
      expect(listPersonas(db)).toHaveLength(1);
      deletePersona("p-1", db);
      expect(listPersonas(db)).toEqual([]);
    });

    it("throws when persona does not exist", () => {
      expect(() => deletePersona("missing", db)).toThrow("Persona not found");
    });
  });
});
