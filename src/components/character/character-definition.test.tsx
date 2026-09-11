// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { makeCharacterData } from "@/db/__tests__/character-data";
import { tokenBreakdown } from "@/routes/characters/detail-helpers";

vi.mock("@/components/MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

import { CharacterDefinition } from "./character-definition";

// No vitest setup file / globals in this repo, so RTL auto-cleanup never runs.
afterEach(cleanup);

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
  );
});

describe("CharacterDefinition", () => {
  it("renders Description first, and the Personality item, with their token labels", () => {
    const data = makeCharacterData();
    render(<CharacterDefinition data={data} />);

    const { description, personality } = tokenBreakdown(data);

    const first = screen.getAllByRole("button")[0];
    expect(first.textContent).toContain("Description");
    expect(within(first).getByText(`${description} tokens`)).toBeDefined();

    const personalityTrigger = screen.getByRole("button", { name: /Personality/ });
    expect(within(personalityTrigger).getByText(`${personality} tokens`)).toBeDefined();
  });

  it("omits empty fields", () => {
    const data = makeCharacterData({ scenario: "", mes_example: "" });
    render(<CharacterDefinition data={data} />);

    expect(screen.queryByText("Scenario")).toBeNull();
    expect(screen.queryByText("Example Messages")).toBeNull();
    expect(screen.getByText("Personality")).toBeDefined();
  });

  it("renders the EmptyState when every definition field is empty", () => {
    const data = makeCharacterData({
      description: "",
      personality: "",
      scenario: "",
      first_mes: "",
      alternate_greetings: [],
      mes_example: "",
      system_prompt: "",
      post_history_instructions: "",
      extensions: {},
    });
    render(<CharacterDefinition data={data} />);

    expect(screen.getByText("No card content")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Personality/ })).toBeNull();
  });

  it("renders the multi-greeting carousel counter and arrows", () => {
    const data = makeCharacterData({ alternate_greetings: ["a", "b"] });
    render(<CharacterDefinition data={data} />);

    // Radix unmounts collapsed content, so expand Greetings to mount the carousel.
    fireEvent.click(screen.getByRole("button", { name: /Greetings/ }));

    // first_mes + 2 alternates === 3 slides
    expect(screen.getByText("1 / 3")).toBeDefined();

    const prev = screen.getByText("Previous slide").closest("button");
    const next = screen.getByText("Next slide").closest("button");
    expect(prev).not.toBeNull();
    expect(next).not.toBeNull();
    // Override keeps the arrows inside AccordionContent's overflow-hidden box.
    expect(prev?.className).toContain("-left-2");
    expect(next?.className).toContain("-right-2");
  });
});
