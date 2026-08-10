// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// vi.hoisted is required: vitest hoists vi.mock factories above top-level const
// declarations, so a factory referencing a plain const hits a TDZ at import time.
const { mockUseCharacter, mockUseDeleteCharacter, mockToastSuccess } = vi.hoisted(() => ({
  mockUseCharacter: vi.fn(),
  mockUseDeleteCharacter: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mockToastSuccess } }));

vi.mock("@/hooks/useCharacters", () => ({
  useCharacter: mockUseCharacter,
  useDeleteCharacter: mockUseDeleteCharacter,
  useUpdateCharacter: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useChats", () => ({
  useCreateChat: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useChatsByCharacter: () => ({ data: [] }),
}));

vi.mock("@/lib/auth-client", () => ({
  // Admin role so isDemo is false and the RowActionsMenu (with Delete) renders.
  authClient: { useSession: () => ({ data: { user: { role: "admin" } } }) },
}));

vi.mock("@tanstack/react-router", () => ({
  // Route.useParams() is called inside CharacterDetailPage ($id.tsx:48).
  createFileRoute: () => (opts: { component: () => ReactNode }) => ({
    component: opts.component,
    useParams: () => ({ id: "char-1" }),
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

// The page renders these for the fixture's non-empty description/personality/
// scenario/first_mes — stub them out to keep the test fast and jsdom-safe.
vi.mock("@/components/character/EmbeddedLorebookPanel", () => ({
  EmbeddedLorebookPanel: () => null,
}));
vi.mock("@/components/MarkdownContent", () => ({ MarkdownContent: () => null }));

import type { CharacterDetail } from "@/db/repositories/characters";
import { makeCharacterData } from "@/db/__tests__/character-data";
import { CharacterDetailPage } from "./$id";

// No vitest setup file / globals in this repo, so RTL auto-cleanup never runs.
afterEach(cleanup);

const zephyr: CharacterDetail = {
  id: "char-1",
  userId: "user-1",
  name: "Zephyr",
  data: makeCharacterData({ name: "Zephyr" }),
  spec: "chara_card_v2",
  specVersion: "2.0",
  imagePath: null,
  tagline: null,
  creator: "tester",
  creatorNotes: "",
  tags: ["test"],
  createdAt: new Date(),
  updatedAt: new Date(),
  chatCount: 2,
  userMessageCount: 2,
  messageCount: 5,
};

describe("CharacterDetailPage delete confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCharacter.mockReturnValue({ data: zephyr, isLoading: false, error: null });
    mockUseDeleteCharacter.mockReturnValue({ isPending: false, mutate: vi.fn() });
    // SectionNav (rendered by the page) creates an IntersectionObserver in a
    // useEffect — jsdom does not implement it.
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows chats and messages counts in the delete confirmation", async () => {
    render(<CharacterDetailPage />);
    // Radix DropdownMenuTrigger opens on pointerdown, not click.
    fireEvent.pointerDown(screen.getByLabelText("Character actions"));
    await act(async () => {});
    fireEvent.click(screen.getByText("Delete"));
    await act(async () => {});

    expect(screen.getByText(/2 chats/)).toBeTruthy();
    expect(screen.getByText(/5 messages/)).toBeTruthy();
  });
});
