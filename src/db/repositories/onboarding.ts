import { eq } from "drizzle-orm";
import { db as defaultDb, type DB } from "@/db";
import { aiProviders, characters, userSettings } from "@/db/schema";
import { upsertUserSettings } from "@/db/repositories/userSettings";

export type OnboardingStatus = {
  completed: boolean;
  hasConfiguredProvider: boolean;
  hasCharacter: boolean;
};

export function getOnboardingStatus(userId: string, db: DB = defaultDb): OnboardingStatus {
  const provider = db.select({ id: aiProviders.id }).from(aiProviders).limit(1).get();
  const character = db.select({ id: characters.id }).from(characters).limit(1).get();
  const settings = db
    .select({ onboardingCompletedAt: userSettings.onboardingCompletedAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();
  return {
    completed: settings?.onboardingCompletedAt != null,
    hasConfiguredProvider: Boolean(provider),
    hasCharacter: Boolean(character),
  };
}

export function completeOnboarding(userId: string, db: DB = defaultDb): { ok: true } {
  const status = getOnboardingStatus(userId, db);
  if (!status.hasConfiguredProvider) throw new Error("Add an AI provider to finish setup");
  if (!status.hasCharacter) throw new Error("Import a character to finish setup");
  upsertUserSettings(userId, { onboardingCompletedAt: new Date() }, db);
  return { ok: true };
}
