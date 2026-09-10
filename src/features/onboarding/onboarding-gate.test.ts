import { describe, expect, it } from "vitest";
import {
  needsOnboarding,
  postAuthTarget,
  redirectTargetForPath,
} from "@/features/onboarding/onboarding-gate";
import type { OnboardingStatus } from "@/server/fns/onboarding";

function status(overrides: Partial<OnboardingStatus> = {}): OnboardingStatus {
  return {
    completed: false,
    hasConfiguredProvider: false,
    hasCharacter: false,
    ...overrides,
  };
}

describe("needsOnboarding", () => {
  it("is false when status is null", () => {
    expect(needsOnboarding(null)).toBe(false);
  });

  it("is true when not completed", () => {
    expect(needsOnboarding(status())).toBe(true);
  });

  it("is false when completed", () => {
    expect(needsOnboarding(status({ completed: true }))).toBe(false);
  });
});

describe("redirectTargetForPath", () => {
  it("redirects any non-onboarding path when not completed", () => {
    expect(redirectTargetForPath("/chat", status())).toBe("/onboarding");
    expect(redirectTargetForPath("/characters", status())).toBe("/onboarding");
  });

  it("never redirects away from /onboarding", () => {
    expect(redirectTargetForPath("/onboarding", status())).toBeNull();
  });

  it("never redirects when completed", () => {
    const done = status({ completed: true });
    expect(redirectTargetForPath("/chat", done)).toBeNull();
    expect(redirectTargetForPath("/onboarding", done)).toBeNull();
  });

  it("is null for null status", () => {
    expect(redirectTargetForPath("/chat", null)).toBeNull();
  });
});

describe("postAuthTarget", () => {
  it("routes un-onboarded users to /onboarding", () => {
    expect(postAuthTarget(status())).toBe("/onboarding");
  });

  it("routes completed users to /chat", () => {
    expect(postAuthTarget(status({ completed: true }))).toBe("/chat");
  });

  it("routes to /chat when status is null", () => {
    expect(postAuthTarget(null)).toBe("/chat");
  });
});
