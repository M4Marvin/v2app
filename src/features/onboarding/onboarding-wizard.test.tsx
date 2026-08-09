// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OnboardingStatus } from "@/server/fns/onboarding";

const navigate = vi.fn();
const invalidateQueries = vi.fn();
const claimAdmin = vi.fn();
const completeOnboarding = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock("@/hooks/useOnboarding", () => ({
  onboardingKeys: { status: ["onboardingStatus"] },
  useClaimAdmin: () => ({ mutate: claimAdmin, isPending: false }),
  useCompleteOnboarding: () => ({ mutate: completeOnboarding, isPending: false }),
  useOnboardingStatus: () => ({ data: mockStatus, isLoading: false }),
}));

vi.mock("./provider-step", () => ({
  ProviderStep: () => <div data-testid="provider-step" />,
}));

vi.mock("./character-step", () => ({
  CharacterStep: () => <div data-testid="character-step" />,
}));

let mockStatus: OnboardingStatus;

function baseStatus(overrides: Partial<OnboardingStatus> = {}): OnboardingStatus {
  return {
    completed: false,
    isAdmin: false,
    adminExists: false,
    canClaimAdmin: true,
    hasConfiguredProvider: false,
    hasCharacter: false,
    ...overrides,
  };
}

import { OnboardingWizard } from "./onboarding-wizard";

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatus = baseStatus();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the welcome step first", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText("Welcome to Charon")).toBeTruthy();
  });

  it("shows the provider step when no provider is configured", () => {
    render(<OnboardingWizard />);
    expect(screen.getByTestId("provider-step")).toBeTruthy();
  });

  it("hides the provider step once a provider is configured", () => {
    mockStatus = baseStatus({ hasConfiguredProvider: true });
    render(<OnboardingWizard />);
    expect(screen.queryByTestId("provider-step")).toBeNull();
  });

  it("shows the claim-admin step when claimable", () => {
    render(<OnboardingWizard />);
    expect(screen.getByText("Make me the admin")).toBeTruthy();
  });

  it("hides the claim-admin step when an admin already exists", () => {
    mockStatus = baseStatus({ canClaimAdmin: false, adminExists: true });
    render(<OnboardingWizard />);
    expect(screen.queryByText("Make me the admin")).toBeNull();
  });

  it("shows the character step", () => {
    render(<OnboardingWizard />);
    expect(screen.getByTestId("character-step")).toBeTruthy();
  });

  it("submits and navigates to /chat on success", async () => {
    mockStatus = baseStatus({
      canClaimAdmin: false,
      hasConfiguredProvider: true,
      hasCharacter: true,
    });
    completeOnboarding.mockImplementation((_args: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("radio", { name: /Let's get started/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Start chatting/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start chatting" }));
    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/chat" }));
  });

  it("moves to the character step when completion fails for a missing character", async () => {
    mockStatus = baseStatus({
      canClaimAdmin: false,
      hasConfiguredProvider: true,
      hasCharacter: true,
    });
    completeOnboarding.mockImplementation(
      (_args: unknown, opts: { onError: (e: Error) => void }) => {
        opts.onError(new Error("Import a character to finish setup"));
      },
    );
    render(<OnboardingWizard />);
    fireEvent.click(screen.getByRole("radio", { name: /Let's get started/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("radio", { name: /Start chatting/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start chatting" }));
    await waitFor(() => expect(completeOnboarding).toHaveBeenCalled());
    expect(screen.getByTestId("character-step")).toBeTruthy();
  });
});
