import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { QuestionnaireItemDefinition } from "@shadcn/react/questionnaire";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import {
  onboardingKeys,
  useClaimAdmin,
  useCompleteOnboarding,
  useOnboardingStatus,
} from "@/hooks/useOnboarding";
import { ProviderStep } from "./provider-step";
import { CharacterStep } from "./character-step";

export function OnboardingWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useOnboardingStatus();
  const claimAdmin = useClaimAdmin();
  const completeOnboarding = useCompleteOnboarding();

  const [item, setItem] = useState<string | null>(null);
  const [invalidItem, setInvalidItem] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const items = useMemo<QuestionnaireItemDefinition[]>(() => {
    if (!status) return [];
    return [
      { name: "welcome", required: true },
      ...(status.canClaimAdmin ? [{ name: "account" }] : []),
      ...(status.hasConfiguredProvider ? [] : [{ name: "provider", required: true }]),
      { name: "character", required: true },
      { name: "ready", required: true },
    ];
  }, [status]);

  const activeItem = item ?? items[0]?.name ?? null;

  const prevItems = useRef<QuestionnaireItemDefinition[]>([]);

  useEffect(() => {
    if (!items.length) return;
    if (item && items.some((i) => i.name === item)) {
      prevItems.current = items;
      return;
    }
    if (!item) {
      setItem(items[0]?.name ?? null);
      prevItems.current = items;
      return;
    }
    const prevIdx = prevItems.current.findIndex((i) => i.name === item);
    const next = items[prevIdx] ?? items[items.length - 1];
    prevItems.current = items;
    if (next) setItem(next.name);
  }, [items, item]);

  const refreshStatus = () => {
    setInvalidItem(null);
    void queryClient.invalidateQueries({ queryKey: onboardingKeys.status });
  };

  const handleClaimAdmin = () => {
    if (claiming || !status?.canClaimAdmin) return;
    setClaiming(true);
    claimAdmin.mutate(undefined, {
      onSuccess: refreshStatus,
      onError: () => {
        setClaiming(false);
        setInvalidItem("account");
      },
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvalidItem(null);
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: "/chat" });
      },
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("provider")) {
          setItem("provider");
          setInvalidItem("provider");
        } else if (message.includes("character")) {
          setItem("character");
          setInvalidItem("character");
        } else {
          setInvalidItem("ready");
        }
      },
    });
  };

  if (isLoading || !status) {
    return <div className="py-16 text-center text-sm text-2">Loading your setup...</div>;
  }

  const providerPending = activeItem === "provider" && !status.hasConfiguredProvider;

  return (
    <Questionnaire
      aria-label="Onboarding"
      items={items}
      item={activeItem}
      onItemChange={(name) => {
        setItem(name);
        setInvalidItem(null);
      }}
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between">
        <QuestionnaireProgress />
        {status.isAdmin ? (
          <span className="text-xs text-2">Admin account</span>
        ) : claiming ? (
          <span className="text-sm text-2">Making you admin...</span>
        ) : null}
      </div>

      <QuestionnaireItem name="welcome" required>
        <QuestionnaireTitle>Welcome to Charon</QuestionnaireTitle>
        <QuestionnaireDescription>
          Your private app for roleplaying with AI characters. Everything stays on your computer. To
          start you need two things: an AI provider (the service that powers the characters) and at
          least one character.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="start">
            Let's get started
            <QuestionnaireChoiceDescription>
              You'll be guided through setup in the next steps.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>

      {status.canClaimAdmin ? (
        <QuestionnaireItem name="account" invalid={invalidItem === "account"}>
          <QuestionnaireTitle>Your account</QuestionnaireTitle>
          <QuestionnaireDescription>
            You're the first person here, so you can become the admin. Admins can import characters
            and manage AI providers.
          </QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="claim" onClick={handleClaimAdmin}>
              Make me the admin
              <QuestionnaireChoiceDescription>
                Recommended for your own install.
              </QuestionnaireChoiceDescription>
            </QuestionnaireChoice>
            <QuestionnaireChoice value="later">Skip for now</QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError>Could not claim admin. Try again.</QuestionnaireError>
        </QuestionnaireItem>
      ) : null}

      {!status.hasConfiguredProvider ? (
        <QuestionnaireItem name="provider" required invalid={invalidItem === "provider"}>
          <QuestionnaireTitle>Connect an AI provider</QuestionnaireTitle>
          <QuestionnaireDescription>
            An AI provider is the service that powers your characters. Charon works with OpenAI,
            OpenRouter, Anthropic (via a proxy), a local Ollama install, and other OpenAI-compatible
            services. Your API key stays in your local database.
          </QuestionnaireDescription>
          <ProviderStep onCreated={refreshStatus} />
          <QuestionnaireError>Connect a provider to continue.</QuestionnaireError>
        </QuestionnaireItem>
      ) : null}

      <QuestionnaireItem name="character" required invalid={invalidItem === "character"}>
        <QuestionnaireTitle>Get a character</QuestionnaireTitle>
        <QuestionnaireDescription>
          Characters come from PNG card files. You can import your own, or keep the ones already
          waiting for you.
        </QuestionnaireDescription>
        <CharacterStep
          hasCharacter={status.hasCharacter}
          isAdmin={status.isAdmin}
          onImported={refreshStatus}
        />
        <QuestionnaireChoices>
          <QuestionnaireChoice value="continue">
            {status.hasCharacter ? "Continue" : "Continue without importing"}
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError>Add a character to continue.</QuestionnaireError>
      </QuestionnaireItem>

      <QuestionnaireItem name="ready" required invalid={invalidItem === "ready"}>
        <QuestionnaireTitle>You're all set</QuestionnaireTitle>
        <QuestionnaireDescription>
          {status.isAdmin ? "You're an admin. " : ""}
          {status.hasConfiguredProvider ? "Your AI provider is connected. " : ""}
          {status.hasCharacter ? "You have characters to talk to. " : ""}
          Click Start chatting to open your chat list.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="finish">Start chatting</QuestionnaireChoice>
        </QuestionnaireChoices>
      </QuestionnaireItem>

      <QuestionnaireActions>
        <QuestionnairePrevious>Back</QuestionnairePrevious>
        <QuestionnaireNext disabled={providerPending}>Next</QuestionnaireNext>
        <QuestionnaireSubmit>Start chatting</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  );
}
