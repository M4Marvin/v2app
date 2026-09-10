import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";
import { getSession } from "@/server/session";
import {
  getLorebook as repoGetLorebook,
  listEntries as repoListEntries,
  setLorebookEnabled as repoSetLorebookEnabled,
  setLoreEntryDisabled as repoSetLoreEntryDisabled,
} from "@/db/repositories/lorebooks";

// ── Validators ──────────────────────────────────────────────────────────────

const SetLorebookEnabledInput = type({
  lorebookId: "string > 0",
  enabled: "boolean",
});

const SetLoreEntryDisabledInput = type({
  lorebookId: "string > 0",
  entryId: "string > 0",
  disabled: "boolean",
});

function validateSetLorebookEnabled(data: unknown): {
  lorebookId: string;
  enabled: boolean;
} {
  const result = SetLorebookEnabledInput(data);
  if (result instanceof type.errors) throw new Error("Invalid input");
  return result;
}

function validateSetLoreEntryDisabled(data: unknown): {
  lorebookId: string;
  entryId: string;
  disabled: boolean;
} {
  const result = SetLoreEntryDisabledInput(data);
  if (result instanceof type.errors) throw new Error("Invalid input");
  return result;
}

// ── Server functions ────────────────────────────────────────────────────────

// Both mutations verify the lorebook exists before touching the
// activation/disable columns; listEntries itself calls getLorebook, which
// throws "Lorebook not found" for a missing row.

export const setLorebookEnabled = createServerFn({ method: "POST" })
  .validator(validateSetLorebookEnabled)
  .handler(async ({ data }): Promise<{ lorebookId: string; enabled: boolean }> => {
    await getSession();
    // Existence check: throws on missing lorebook.
    repoGetLorebook(data.lorebookId);
    repoSetLorebookEnabled(data.lorebookId, data.enabled);
    return { lorebookId: data.lorebookId, enabled: data.enabled };
  });

export const setLoreEntryDisabled = createServerFn({ method: "POST" })
  .validator(validateSetLoreEntryDisabled)
  .handler(async ({ data }): Promise<{ entryId: string; disabled: boolean }> => {
    await getSession();
    // Ensure the entry actually belongs to this lorebook before touching it.
    const entries = repoListEntries(data.lorebookId);
    if (!entries.some((e) => e.id === data.entryId)) {
      throw new Error("Lore entry not found");
    }
    repoSetLoreEntryDisabled(data.entryId, data.disabled);
    return { entryId: data.entryId, disabled: data.disabled };
  });
