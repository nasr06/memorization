import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cards, reviewLog } from "@/db/schema";
import type { Card } from "@/db/schema";
import type { CardSchedule } from "@/lib/sm2";

export async function getDueAndNewCards(deckId: string): Promise<Card[]> {
  const now = Math.floor(Date.now() / 1000);

  const allCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId));

  // new cards (queue=0) OR due cards (queue != -1 && queue != 0 && due <= now)
  return allCards
    .filter(
      (c) =>
        c.queue === 0 ||
        (c.queue !== -1 && c.due !== null && c.due <= now)
    )
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
}

export async function getDueCount(deckId: string): Promise<number> {
  const cards = await getDueAndNewCards(deckId);
  return cards.length;
}

export async function updateCardSchedule(
  id: string,
  schedule: CardSchedule
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .update(cards)
    .set({
      ease: schedule.ease,
      interval: schedule.interval,
      reps: schedule.reps,
      due: schedule.due,
      // reps=0 after Again means learning; reps>0 is review
      queue: schedule.reps === 0 ? 1 : 2,
      updatedAt: now,
    })
    .where(eq(cards.id, id));
}

export async function logReview(data: {
  cardId: string;
  rating: number;
  timeTaken: number;
  prevDue: number | null;
  prevEase: number | null;
}): Promise<void> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db.insert(reviewLog).values({
    id,
    cardId: data.cardId,
    rating: data.rating,
    timeTaken: data.timeTaken,
    prevDue: data.prevDue,
    prevEase: data.prevEase,
    reviewedAt: now,
  });
}
