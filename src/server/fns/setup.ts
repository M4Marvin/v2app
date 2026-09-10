import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { user } from "@/db/schema";

// Public (no session): the very first visitor with an empty user table needs
// to create the account. Inlined count query — no repository for one caller.
export const getSetupRequired = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ needsSetup: boolean }> => {
    const existing = db.select({ id: user.id }).from(user).limit(1).get();
    return { needsSetup: !existing };
  },
);
