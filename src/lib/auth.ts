import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { username } from "better-auth/plugins/username";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { seedSampleData } from "@/server/seed";

const appUrl = process.env.APP_URL || "http://localhost:3000";
const extraOrigins = (process.env.TRUSTED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: appUrl,
  trustedOrigins: [appUrl, "http://localhost:4173", ...extraOrigins],
  // Allow cookie auth over plain-HTTP origins (LAN / reverse proxy without
  // TLS). With an https baseURL, better-auth sets the Secure flag and browsers
  // won't send the session cookie back over http, breaking login there.
  advanced: {
    useSecureCookies: false,
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const existing = db.select({ id: user.id }).from(user).limit(1).get();
          if (existing) {
            throw new Error("This instance already has an account");
          }
        },
        after: async (userData) => {
          await seedSampleData(userData.id);
        },
      },
    },
  },
  plugins: [username(), tanstackStartCookies()],
});
