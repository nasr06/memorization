import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { streak } from "@/db/schema";
import type { Streak } from "@/db/schema";

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function getOrCreateStreak(): Promise<Streak> {
  const rows = await db
    .select()
    .from(streak)
    .where(eq(streak.id, "singleton"));

  if (rows.length > 0) {
    return rows[0];
  }

  const now = Math.floor(Date.now() / 1000);
  const newStreak: Streak = {
    id: "singleton",
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    streakFreezes: 0,
    totalXP: 0,
    weeklyXP: 0,
    weekStartDate: null,
    updatedAt: now,
  };
  await db.insert(streak).values(newStreak);
  return newStreak;
}

export async function recordStudyDay(): Promise<Streak> {
  const existing = await getOrCreateStreak();
  const today = getTodayISO();
  const yesterday = getYesterdayISO();
  const now = Math.floor(Date.now() / 1000);

  // Already studied today — no change
  if (existing.lastStudyDate === today) {
    return existing;
  }

  let currentStreak = existing.currentStreak ?? 0;
  let longestStreak = existing.longestStreak ?? 0;
  const streakFreezes = existing.streakFreezes ?? 0;

  if (existing.lastStudyDate === yesterday) {
    // Consecutive day — increment
    currentStreak += 1;
  } else if (streakFreezes > 0 && existing.lastStudyDate !== null) {
    // Use a freeze to maintain streak
    await db
      .update(streak)
      .set({ streakFreezes: streakFreezes - 1 })
      .where(eq(streak.id, "singleton"));
    currentStreak += 1;
  } else {
    // Streak broken — reset to 1
    currentStreak = 1;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const updated: Partial<Streak> = {
    currentStreak,
    longestStreak,
    lastStudyDate: today,
    updatedAt: now,
  };

  await db
    .update(streak)
    .set(updated)
    .where(eq(streak.id, "singleton"));

  return { ...existing, ...updated };
}

export async function addXPToStreak(amount: number): Promise<void> {
  const existing = await getOrCreateStreak();
  const now = Math.floor(Date.now() / 1000);
  await db
    .update(streak)
    .set({
      totalXP: (existing.totalXP ?? 0) + amount,
      weeklyXP: (existing.weeklyXP ?? 0) + amount,
      updatedAt: now,
    })
    .where(eq(streak.id, "singleton"));
}
