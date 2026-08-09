import { createServerFn } from "@tanstack/react-start";
import { getSession } from "@/server/session";
import {
  claimAdminRole as repoClaimAdminRole,
  completeOnboarding as repoCompleteOnboarding,
  getOnboardingStatus as repoGetOnboardingStatus,
  type OnboardingStatus,
} from "@/db/repositories/onboarding";

export type { OnboardingStatus };

export const getOnboardingStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnboardingStatus> => {
    const { user } = await getSession();
    return repoGetOnboardingStatus(user.id);
  },
);

export const claimAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { user } = await getSession();
  return repoClaimAdminRole(user.id);
});

export const completeOnboarding = createServerFn({ method: "POST" }).handler(async () => {
  const { user } = await getSession();
  return repoCompleteOnboarding(user.id);
});
