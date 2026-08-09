import type { OnboardingStatus } from "@/server/fns/onboarding";

export function needsOnboarding(status: OnboardingStatus | null | undefined): boolean {
  return Boolean(status && !status.completed);
}

export function redirectTargetForPath(
  pathname: string,
  status: OnboardingStatus | null,
): string | null {
  if (!status || status.completed) return null;
  if (pathname !== "/onboarding") return "/onboarding";
  return null;
}

export function postAuthTarget(status: OnboardingStatus | null): "/onboarding" | "/chat" {
  return status && !status.completed ? "/onboarding" : "/chat";
}
