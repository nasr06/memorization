import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key));
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await getSetting(key);
  if (existing !== null) {
    await db
      .update(settings)
      .set({ value })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key && row.value !== null && row.value !== undefined) {
      result[row.key] = row.value;
    }
  }
  return result;
}
