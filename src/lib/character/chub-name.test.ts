import { describe, expect, it } from "vitest";

import { deriveDisplayName } from "@/lib/character/chub-name";
import type { CharacterDataV2 } from "@/lib/st-core/character";

function makeData(overrides: Partial<CharacterDataV2> = {}): CharacterDataV2 {
  return {
    name: "Test",
    description: "",
    personality: "",
    scenario: "",
    first_mes: "",
    mes_example: "",
    creator_notes: "",
    system_prompt: "",
    post_history_instructions: "",
    alternate_greetings: [],
    tags: [],
    creator: "",
    character_version: "",
    extensions: {},
    ...overrides,
  };
}

describe("deriveDisplayName", () => {
  it("humanizes the last segment of a Chub full_path", () => {
    const data = makeData({
      extensions: { chub: { full_path: "Anonymous/emme-freehold-your-pet-mom-656d8b705cfb" } },
    });

    expect(deriveDisplayName(data)).toBe("Emme Freehold Your Pet Mom");
  });

  it("strips the trailing hex ObjectId suffix from the slug", () => {
    const data = makeData({
      extensions: {
        chub: { full_path: "Goonmok/a-weekend-with-your-aunt-mahoro-aoyama-048d5cbab78f" },
      },
    });

    expect(deriveDisplayName(data)).toBe("A Weekend With Your Aunt Mahoro Aoyama");
  });

  it("falls back to data.name when extensions.chub is missing", () => {
    const data = makeData({ extensions: {} });

    expect(deriveDisplayName(data)).toBe("Test");
  });

  it("falls back to data.name when full_path is missing or empty", () => {
    const missing = makeData({ extensions: { chub: {} } });
    const empty = makeData({ extensions: { chub: { full_path: "" } } });

    expect(deriveDisplayName(missing)).toBe("Test");
    expect(deriveDisplayName(empty)).toBe("Test");
  });

  it("trims trailing whitespace from data.name", () => {
    const data = makeData({ name: "Sarah ", extensions: {} });

    expect(deriveDisplayName(data)).toBe("Sarah");
  });

  it("falls back to data.name when the slug humanizes to an empty string", () => {
    const data = makeData({
      name: "Test",
      extensions: { chub: { full_path: "x/1234567890ab" } },
    });

    expect(deriveDisplayName(data)).toBe("Test");
  });

  it("strips an uppercase hex ObjectId suffix", () => {
    const data = makeData({
      extensions: { chub: { full_path: "Author/char-name-ABC123DEF456" } },
    });

    expect(deriveDisplayName(data)).toBe("Char Name");
  });

  it("treats underscores as word separators", () => {
    const data = makeData({
      extensions: { chub: { full_path: "Author/my_mom" } },
    });

    expect(deriveDisplayName(data)).toBe("My Mom");
  });
});
