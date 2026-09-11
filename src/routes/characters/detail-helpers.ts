import type { CharacterDataV2 } from "@/lib/st-core/character";
import type { CharacterCardItem } from "@/db/repositories/characters";
import { ApproxTokenCounter } from "@/lib/st-core/shared/tokens.js";

export function tokenBreakdown(data: CharacterDataV2): {
  description: number;
  personality: number;
  scenario: number;
  greetings: number;
  exampleMessages: number;
  systemPrompt: number;
  postHistory: number;
  depthPrompt: number;
  total: number;
} {
  const count = (t: string) => new ApproxTokenCounter().count(t);
  const description = count(data.description);
  const personality = count(data.personality);
  const scenario = count(data.scenario);
  const greetings =
    count(data.first_mes) + data.alternate_greetings.reduce((n, g) => n + count(g), 0);
  const exampleMessages = count(data.mes_example);
  const systemPrompt = count(data.system_prompt);
  const postHistory = count(data.post_history_instructions);
  const depthPrompt = count(data.extensions.depth_prompt?.prompt ?? "");
  const total =
    description +
    personality +
    scenario +
    greetings +
    exampleMessages +
    systemPrompt +
    postHistory +
    depthPrompt;
  return {
    description,
    personality,
    scenario,
    greetings,
    exampleMessages,
    systemPrompt,
    postHistory,
    depthPrompt,
    total,
  };
}

export function pickMoreByCreator(
  items: CharacterCardItem[],
  creator: string,
  currentId: string,
  limit = 8,
): CharacterCardItem[] {
  const seen = new Set<string>();
  const filtered = items.filter((item) => {
    if (item.creator !== creator || item.id === currentId || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return filtered.slice(0, limit);
}
