import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  claimAdmin,
  completeOnboarding,
  getOnboardingStatus,
  type OnboardingStatus,
} from "@/server/fns/onboarding";

export const onboardingKeys = {
  status: ["onboardingStatus"] as const,
};

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.status,
    queryFn: () => getOnboardingStatus(),
  });
}

export function useClaimAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => claimAdmin(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.status });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => completeOnboarding(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.status });
    },
  });
}

export type { OnboardingStatus };
