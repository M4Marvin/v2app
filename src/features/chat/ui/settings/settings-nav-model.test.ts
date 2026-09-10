import { describe, expect, it } from "vitest";
import type { SettingsSection } from "./settings-nav-model";
import { getVisibleNavGroups } from "./settings-nav-model";

/** Real lucide icons aren't needed for grouping logic; a plain stub stands in. */
const icon = {} as SettingsSection["icon"];

const SECTIONS: SettingsSection[] = [
  { id: "connection", label: "Connection", icon, group: "connection" },
  {
    id: "providers",
    label: "Providers",
    icon,
    group: "connection",
    secondary: true,
  },
  { id: "presets", label: "Presets", icon, group: "connection", secondary: true },
  { id: "persona", label: "Persona", icon, group: "chat" },
  { id: "lorebooks", label: "Lorebooks", icon, group: "chat" },
  { id: "prompts", label: "Prompts", icon, group: "chat" },
  { id: "character", label: "Character", icon, group: "chat" },
  { id: "scene", label: "Scene", icon, group: "chat" },
  { id: "display", label: "Display", icon, group: "display" },
];

describe("getVisibleNavGroups", () => {
  it("groups all sections into [connection, chat, display] with labels and item counts", () => {
    const groups = getVisibleNavGroups(SECTIONS);

    expect(groups.map((g) => g.id)).toEqual(["connection", "chat", "display"]);
    expect(groups.map((g) => g.label)).toEqual(["Connection", "Chat", "Display"]);
    expect(groups.map((g) => g.items.length)).toEqual([3, 5, 1]);
  });

  it("renders every section with no role filtering", () => {
    const groups = getVisibleNavGroups(SECTIONS);
    const ids = groups.flatMap((g) => g.items.map((s) => s.id));

    expect(ids).toEqual([
      "connection",
      "providers",
      "presets",
      "persona",
      "lorebooks",
      "prompts",
      "character",
      "scene",
      "display",
    ]);
  });

  it("preserves secondary flags through grouping", () => {
    const groups = getVisibleNavGroups(SECTIONS);
    const connection = groups.find((g) => g.id === "connection")!;

    expect(connection.items.map((s) => s.secondary)).toEqual([undefined, true, true]);
  });

  it("preserves input order of items within each group", () => {
    const groups = getVisibleNavGroups(SECTIONS);
    const chat = groups.find((g) => g.id === "chat")!;

    expect(chat.items.map((s) => s.id)).toEqual([
      "persona",
      "lorebooks",
      "prompts",
      "character",
      "scene",
    ]);
  });

  it("returns [] for empty input", () => {
    expect(getVisibleNavGroups([])).toEqual([]);
  });
});
