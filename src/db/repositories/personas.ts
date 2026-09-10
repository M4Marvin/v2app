import { asc, eq } from "drizzle-orm";
import { db as defaultDb, type DB } from "@/db";
import { personas, type NewPersona, type Persona } from "@/db/schema";

export type CreatePersonaInput = {
  id: string;
  name: string;
  description?: string | null;
  iconPath?: string | null;
};

export type UpdatePersonaInput = {
  name?: string;
  description?: string | null;
  iconPath?: string | null;
};

export function listPersonas(db: DB = defaultDb): Persona[] {
  return db.select().from(personas).orderBy(asc(personas.name)).all();
}

export function getPersona(id: string, db: DB = defaultDb): Persona {
  const row = db.select().from(personas).where(eq(personas.id, id)).get();
  if (!row) throw new Error("Persona not found");
  return row;
}

export function createPersona(input: CreatePersonaInput, db: DB = defaultDb): Persona {
  const row: NewPersona = {
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    iconPath: input.iconPath ?? null,
  };
  return db.insert(personas).values(row).returning().get();
}

export function updatePersona(
  id: string,
  patch: UpdatePersonaInput,
  db: DB = defaultDb,
): Persona {
  const existing = getPersona(id, db);
  const updates: Partial<NewPersona> = { updatedAt: new Date() };
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.iconPath !== undefined) updates.iconPath = patch.iconPath;
  const row = db
    .update(personas)
    .set(updates)
    .where(eq(personas.id, existing.id))
    .returning()
    .get();
  if (!row) throw new Error("Persona not found");
  return row;
}

export function deletePersona(id: string, db: DB = defaultDb): void {
  const existing = getPersona(id, db);
  db.delete(personas).where(eq(personas.id, existing.id)).run();
}
