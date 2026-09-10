import { seedDefaultBackgrounds } from "@/server/seed";
import { ensureUploadsDirs } from "@/server/uploads";

export async function ensureStartupTasks(): Promise<void> {
  await ensureUploadsDirs();
  await seedDefaultBackgrounds();
}
