import { Logo } from "@/components/common/Logo";
import { OnboardingWizard } from "./onboarding-wizard";

export function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-8">
      <div className="mb-8 flex items-center justify-center gap-2">
        <Logo className="size-7" />
        <span className="text-sm font-semibold tracking-tight">Charon</span>
      </div>
      <OnboardingWizard />
    </main>
  );
}
