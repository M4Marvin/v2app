import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeTestDb, seedTestUser, type TestDb } from "./helpers";
import { makeCharacterData } from "./character-data";
import { aiProviders, characters, user } from "@/db/schema";
import {
  claimAdminRole,
  completeOnboarding,
  getOnboardingStatus,
} from "@/db/repositories/onboarding";
import { countAdmins } from "@/db/repositories/users";
import { upsertUserSettings } from "@/db/repositories/userSettings";

function seedProvider(db: TestDb, userId: string, id = "prov-1") {
  const now = new Date();
  db.insert(aiProviders)
    .values({
      id,
      userId,
      name: "Test Provider",
      baseUrl: "https://example.com/v1",
      apiKey: "test-key",
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

function seedCharacter(db: TestDb, userId: string, id = "char-1") {
  const now = new Date();
  db.insert(characters)
    .values({
      id,
      userId,
      name: "Test Character",
      tagline: "tagline",
      spec: "chara_card_v2",
      specVersion: "1.0",
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
      expect(status.isAdmin).toBe(false);
      expect(status.canClaimAdmin).toBe(true);
      expect(status.hasConfiguredProvider).toBe(false);
      expect(status.hasCharacter).toBe(false);
    });

    it("reports canClaimAdmin false once any admin exists", () => {
      seedTestUser(db, "admin-1");
      db.update(user).set({ role: "admin" }).where(eq(user.id, "admin-1")).run();
      const status = getOnboardingStatus(userId, db);
      expect(status.canClaimAdmin).toBe(false);
      expect(status.adminExists).toBe(true);
    });

    it("counts only the user's own provider, not the global fallback", () => {
      const now = new Date();
      db.insert(aiProviders)
        .values({
          id: "global-1",
          userId: null,
          name: "Built-in",
          baseUrl: "https://example.com/v1",
          apiKey: "not-configured",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      expect(getOnboardingStatus(userId, db).hasConfiguredProvider).toBe(false);
      seedProvider(db, userId);
      expect(getOnboardingStatus(userId, db).hasConfiguredProvider).toBe(true);
    });

    it("reports hasCharacter once a character exists", () => {
      seedCharacter(db, userId);
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

  describe("claimAdminRole", () => {
    it("promotes the first user to admin", () => {
      claimAdminRole(userId, db);
      const row = db.select().from(user).where(eq(user.id, userId)).get();
      expect(row?.role).toBe("admin");
      expect(countAdmins(db)).toBe(1);
    });

    it("rejects when an admin already exists", () => {
      seedTestUser(db, "admin-1");
      db.update(user).set({ role: "admin" }).where(eq(user.id, "admin-1")).run();
      expect(() => claimAdminRole(userId, db)).toThrow("An admin already exists");
      const row = db.select().from(user).where(eq(user.id, userId)).get();
      expect(row?.role).toBe("user");
    });

    it("rejects a second claim attempt", () => {
      claimAdminRole(userId, db);
      expect(() => claimAdminRole(userId, db)).toThrow("An admin already exists");
    });
  });

  describe("completeOnboarding", () => {
    it("rejects without a configured provider", () => {
      seedCharacter(db, userId);
      expect(() => completeOnboarding(userId, db)).toThrow("Add an AI provider");
    });

    it("rejects without a character", () => {
      seedProvider(db, userId);
      expect(() => completeOnboarding(userId, db)).toThrow("Import a character");
    });

    it("sets onboardingCompletedAt once provider and character exist", () => {
      seedProvider(db, userId);
      seedCharacter(db, userId);
      const result = completeOnboarding(userId, db);
      expect(result.ok).toBe(true);
      expect(getOnboardingStatus(userId, db).completed).toBe(true);
    });

    it("is idempotent once completed", () => {
      seedProvider(db, userId);
      seedCharacter(db, userId);
      completeOnboarding(userId, db);
      expect(completeOnboarding(userId, db).ok).toBe(true);
    });
  });
});
