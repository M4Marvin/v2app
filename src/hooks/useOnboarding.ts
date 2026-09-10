import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
