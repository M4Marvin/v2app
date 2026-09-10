import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, seedTestUser, type TestDb } from "./helpers";
import { makeCharacterData } from "./character-data";
import { aiProviders, characters } from "@/db/schema";
import { completeOnboarding, getOnboardingStatus } from "@/db/repositories/onboarding";
import { upsertUserSettings } from "@/db/repositories/userSettings";

function seedProvider(db: TestDb, id = "prov-1") {
  const now = new Date();
  db.insert(aiProviders)
    .values({
      id,
      name: "Test Provider",
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

function seedCharacter(db: TestDb, id = "char-1") {
  const now = new Date();
  db.insert(characters)
    .values({
      id,
      name: "Test Character",
      data: makeCharacterData(),
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

describe("onboarding repo", () => {
  let db: TestDb;
  let userId: string;

  let ctx: ReturnType<typeof makeTestDb>;

  beforeEach(() => {
    ctx = makeTestDb();
    db = ctx.db;
    userId = seedTestUser(db);
  });

  afterEach(() => {
    ctx.sqlite.close();
  });

  describe("getOnboardingStatus", () => {
    it("reports nothing configured for a fresh user", () => {
      const status = getOnboardingStatus(userId, db);
      expect(status.completed).toBe(false);
      expect(status.hasConfiguredProvider).toBe(false);
      expect(status.hasCharacter).toBe(false);
    });

    it("reports hasConfiguredProvider once any provider exists", () => {
      seedProvider(db);
      expect(getOnboardingStatus(userId, db).hasConfiguredProvider).toBe(true);
    });

    it("reports hasCharacter once a character exists", () => {
      seedCharacter(db);
      expect(getOnboardingStatus(userId, db).hasCharacter).toBe(true);
    });

    it("reports completed once onboardingCompletedAt is set", () => {
      upsertUserSettings(userId, { onboardingCompletedAt: new Date() }, db);
      expect(getOnboardingStatus(userId, db).completed).toBe(true);
    });

    it("treats a user without a settings row as not completed", () => {
      expect(getOnboardingStatus(userId, db).completed).toBe(false);
    });
  });

  describe("completeOnboarding", () => {
    it("rejects without a configured provider", () => {
      seedCharacter(db);
      expect(() => completeOnboarding(userId, db)).toThrow("Add an AI provider");
    });

    it("rejects without a character", () => {
      seedProvider(db);
      expect(() => completeOnboarding(userId, db)).toThrow("Import a character");
    });

    it("sets onboardingCompletedAt once provider and character exist", () => {
      seedProvider(db);
      seedCharacter(db);
      const result = completeOnboarding(userId, db);
      expect(result.ok).toBe(true);
      expect(getOnboardingStatus(userId, db).completed).toBe(true);
    });

    it("is idempotent once completed", () => {
      seedProvider(db);
      seedCharacter(db);
      completeOnboarding(userId, db);
      expect(completeOnboarding(userId, db).ok).toBe(true);
    });
  });
});
