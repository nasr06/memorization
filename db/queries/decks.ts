import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decks, cards, notes, noteTypes, reviewLog } from "@/db/schema";
import type { Deck } from "@/db/schema";

export async function getAllDecks(): Promise<Deck[]> {
  return db.select().from(decks).orderBy(decks.createdAt);
}

export async function getDeckById(id: string): Promise<Deck | undefined> {
  const result = await db.select().from(decks).where(eq(decks.id, id));
  return result[0];
}

export async function createDeck(data: {
  name: string;
  description?: string;
  coverColor?: string;
  coverEmoji?: string;
}): Promise<Deck> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const newDeck = {
    id,
    name: data.name,
    description: data.description ?? null,
    coverColor: data.coverColor ?? "#6C63FF",
    coverEmoji: data.coverEmoji ?? "📚",
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(decks).values(newDeck);
  return newDeck as Deck;
}

export async function deleteDeck(id: string): Promise<void> {
  // Delete in FK order: reviewLog -> cards -> notes -> noteTypes -> deck
  const deckCards = await db.select({ id: cards.id }).from(cards).where(eq(cards.deckId, id));
  for (const card of deckCards) {
    await db.delete(reviewLog).where(eq(reviewLog.cardId, card.id));
  }
  await db.delete(cards).where(eq(cards.deckId, id));
  await db.delete(notes).where(eq(notes.deckId, id));
  await db.delete(noteTypes).where(eq(noteTypes.deckId, id));
  await db.delete(decks).where(eq(decks.id, id));
}

export interface DeckStats {
  newCount: number;
  dueCount: number;
  totalCount: number;
}

export async function getDeckStats(deckId: string): Promise<DeckStats> {
  const now = Math.floor(Date.now() / 1000);

  const allCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId));

  const totalCount = allCards.length;
  const newCount = allCards.filter((c) => c.queue === 0).length;
  const dueCount = allCards.filter(
    (c) =>
      c.queue !== -1 &&
      c.queue !== 0 &&
      c.due !== null &&
      c.due <= now
  ).length;

  return { newCount, dueCount, totalCount };
}
