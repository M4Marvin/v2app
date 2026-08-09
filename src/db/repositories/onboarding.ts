import { eq } from "drizzle-orm";
import { db as defaultDb, type DB } from "@/db";
import { aiProviders, characters, user, userSettings } from "@/db/schema";
import { countAdmins } from "@/db/repositories/users";
import { upsertUserSettings } from "@/db/repositories/userSettings";

export type OnboardingStatus = {
  completed: boolean;
  isAdmin: boolean;
  adminExists: boolean;
  canClaimAdmin: boolean;
  hasConfiguredProvider: boolean;
  hasCharacter: boolean;
};

export function getOnboardingStatus(userId: string, db: DB = defaultDb): OnboardingStatus {
  const userRow = db.select({ role: user.role }).from(user).where(eq(user.id, userId)).get();
  const isAdmin = userRow?.role === "admin";
  const provider = db
    .select({ id: aiProviders.id })
    .from(aiProviders)
    .where(eq(aiProviders.userId, userId))
    .limit(1)
    .get();
  const character = db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1)
    .get();
  const settings = db
    .select({ onboardingCompletedAt: userSettings.onboardingCompletedAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();
  const adminCount = countAdmins(db);
  return {
    completed: settings?.onboardingCompletedAt != null,
    isAdmin,
    adminExists: adminCount > 0,
    canClaimAdmin: !isAdmin && adminCount === 0,
    hasConfiguredProvider: Boolean(provider),
    hasCharacter: Boolean(character),
  };
}

export function claimAdminRole(userId: string, db: DB = defaultDb): { ok: true } {
  if (countAdmins(db) > 0) throw new Error("An admin already exists");
  db.update(user).set({ role: "admin", updatedAt: new Date() }).where(eq(user.id, userId)).run();
  return { ok: true };
}

export function completeOnboarding(userId: string, db: DB = defaultDb): { ok: true } {
  const status = getOnboardingStatus(userId, db);
  if (!status.hasConfiguredProvider) throw new Error("Add an AI provider to finish setup");
  if (!status.hasCharacter) throw new Error("Import a character to finish setup");
  upsertUserSettings(userId, { onboardingCompletedAt: new Date() }, db);
  return { ok: true };
}
