import type { CharacterDataV2 } from "@/lib/st-core/character";

/**
 * Derive a display name for an imported character from its Chub slug.
 *
 * Chub stores the canonical slug in `extensions.chub.full_path` (e.g.
 * `"Anonymous/emme-freehold-your-pet-mom-656d8b705cfb"`). The trailing
 * `-<12 hex chars>` segment is the Chub ObjectId suffix, not part of the
 * title. Falls back to `data.name.trim()` when the chub metadata is missing,
 * empty, or the slug does not humanize to anything meaningful.
 */
export function deriveDisplayName(data: CharacterDataV2): string {
  const chub = data.extensions?.chub as { full_path?: unknown } | undefined;

  if (typeof chub?.full_path === "string" && chub.full_path.trim() !== "") {
    const slug = chub.full_path.trim().split("/").pop() ?? "";
    const words = slug
      .replace(/[0-9a-f]{12}$/i, "")
      .replace(/[_-]+/g, "-")
      .split("-")
      .filter((word) => word.length > 0);
    const humanized = words
      .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (humanized !== "") {
      return humanized;
    }
  }

  return data.name.trim();
}
