import { describe, expect, it } from "vitest";
import type { CharacterCardItem } from "@/db/repositories/characters";
import type { CharacterDataV2 } from "@/lib/st-core/character";
import { makeCharacterData } from "@/db/__tests__/character-data";
import { pickMoreByCreator, tokenBreakdown } from "./detail-helpers";

function emptyData(): CharacterDataV2 {
  return makeCharacterData({
    name: "",
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
  });
}

function card(id: string, overrides: Partial<CharacterCardItem> = {}): CharacterCardItem {
  return {
    id,
    name: id,
    spec: "chara_card_v2",
    specVersion: "2.0",
    imagePath: null,
    tagline: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    tags: [],
    creatorNotes: "",
    creator: "creator",
    chatCount: 0,
    ...overrides,
  };
}

describe("tokenBreakdown", () => {
  it("returns all zeros for empty data", () => {
    expect(tokenBreakdown(emptyData())).toEqual({
      description: 0,
      personality: 0,
      scenario: 0,
      greetings: 0,
      exampleMessages: 0,
      systemPrompt: 0,
      postHistory: 0,
      depthPrompt: 0,
      total: 0,
    });
  });

  it("rounds each field up to the nearest token (ceil(len/4))", () => {
    expect(tokenBreakdown(emptyData()).description).toBe(0);
    expect(tokenBreakdown({ ...emptyData(), description: "abcd" }).description).toBe(1);
    expect(tokenBreakdown({ ...emptyData(), description: "abcde" }).description).toBe(2);
  });

  it("sums first_mes and every alternate greeting into greetings", () => {
    const b = tokenBreakdown({
      ...emptyData(),
      first_mes: "abcd", // 1
      alternate_greetings: ["efgh", "ijklmnop"], // 1 + 2
    });
    expect(b.greetings).toBe(4);
  });

  it("counts the depth prompt from extensions, missing one is 0", () => {
    expect(tokenBreakdown(emptyData()).depthPrompt).toBe(0);
    const b = tokenBreakdown({
      ...emptyData(),
      extensions: { depth_prompt: { prompt: "abcde", depth: 4, role: "system" } },
    });
    expect(b.depthPrompt).toBe(2);
  });

  it("total equals the sum of the eight field counts", () => {
    const data: CharacterDataV2 = {
      ...emptyData(),
      description: "abcd", // 1
      personality: "abcde", // 2
      scenario: "abcdefgh", // 2
      first_mes: "abcd", // 1
      alternate_greetings: ["abcd", "abcde"], // 1 + 2
      mes_example: "abcdefghijkl", // 3
      system_prompt: "abcde", // 2
      post_history_instructions: "abcdefgh", // 2
      extensions: { depth_prompt: { prompt: "abcde", depth: 2, role: "system" } }, // 2
    };
    const b = tokenBreakdown(data);
    const sum =
      b.description +
      b.personality +
      b.scenario +
      b.greetings +
      b.exampleMessages +
      b.systemPrompt +
      b.postHistory +
      b.depthPrompt;
    expect(sum).toBe(18);
    expect(b.total).toBe(sum);
    expect(b.total).toBe(18);
  });
});

describe("pickMoreByCreator", () => {
  it("returns [] for empty input", () => {
    expect(pickMoreByCreator([], "creator", "current")).toEqual([]);
  });

  it("keeps only items with the exact creator", () => {
    const items = [
      card("a", { creator: "Aria" }),
      card("b", { creator: "aria" }), // case differs
      card("c", { creator: "NotAria" }),
    ];
    expect(pickMoreByCreator(items, "Aria", "current").map((i) => i.id)).toEqual(["a"]);
  });

  it("excludes the current character", () => {
    const items = [card("a", { creator: "Aria" }), card("current", { creator: "Aria" })];
    expect(pickMoreByCreator(items, "Aria", "current").map((i) => i.id)).toEqual(["a"]);
  });

  it("excludes a same-name item with a different creator (fuzzy q trap)", () => {
    const items = [
      card("fan", { name: "Aria Fanart", creator: "someone-else" }),
      card("real", { name: "Aria", creator: "Aria" }),
    ];
    expect(pickMoreByCreator(items, "Aria", "current").map((i) => i.id)).toEqual(["real"]);
  });

  it("dedupes repeated ids", () => {
    const items = [
      card("a", { creator: "Aria" }),
      card("a", { creator: "Aria" }),
      card("b", { creator: "Aria" }),
    ];
    expect(pickMoreByCreator(items, "Aria", "current").map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("respects the limit (default and explicit)", () => {
    const items = Array.from({ length: 10 }, (_, i) => card(`c${i}`, { creator: "Aria" }));
    expect(pickMoreByCreator(items, "Aria", "current")).toHaveLength(8);
    expect(pickMoreByCreator(items, "Aria", "current", 3).map((i) => i.id)).toEqual([
      "c0",
      "c1",
      "c2",
    ]);
    expect(pickMoreByCreator(items, "Aria", "current", 0)).toEqual([]);
  });
});
