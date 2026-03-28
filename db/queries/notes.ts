import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { notes, noteTypes, cards } from "@/db/schema";
import type { Note, Card, NoteType } from "@/db/schema";

export async function createNoteWithCard(
  deckId: string,
  front: string,
  back: string
): Promise<{ note: Note; card: Card }> {
  const now = Math.floor(Date.now() / 1000);

  // Find or create a "Basic" NoteType for this deck
  const existingTypes = await db
    .select()
    .from(noteTypes)
    .where(and(eq(noteTypes.deckId, deckId), eq(noteTypes.name, "Basic")));

  let noteTypeId: string;
  if (existingTypes.length > 0) {
    noteTypeId = existingTypes[0].id;
  } else {
    noteTypeId = crypto.randomUUID();
    await db.insert(noteTypes).values({
      id: noteTypeId,
      deckId,
      name: "Basic",
      fields: JSON.stringify(["Front", "Back"]),
      templates: JSON.stringify([{ front: "{{Front}}", back: "{{Back}}" }]),
      css: null,
    });
  }

  // Create the note
  const noteId = crypto.randomUUID();
  const newNote = {
    id: noteId,
    deckId,
    noteTypeId,
    fields: JSON.stringify({ Front: front, Back: back }),
    tags: JSON.stringify([]),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(notes).values(newNote);

  // Create the card
  const cardId = crypto.randomUUID();
  const newCard = {
    id: cardId,
    noteId,
    deckId,
    templateIndex: 0,
    due: 0,
    queue: 0,
    reps: 0,
    lapses: 0,
    ease: 2.5,
    interval: 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(cards).values(newCard);

  return { note: newNote as Note, card: newCard as Card };
}

export async function getNotesWithTypes(
  deckId: string
): Promise<Array<Note & { noteType: NoteType | null }>> {
  const rows = await db
    .select()
    .from(notes)
    .leftJoin(noteTypes, eq(notes.noteTypeId, noteTypes.id))
    .where(eq(notes.deckId, deckId));

  return rows.map((row) => ({
    ...row.notes,
    noteType: row.note_types ?? null,
  }));
}

export async function getNotesByDeck(
  deckId: string
): Promise<Array<Note & { card: Card }>> {
  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.deckId, deckId));

  const result: Array<Note & { card: Card }> = [];

  for (const note of noteRows) {
    const cardRows = await db
      .select()
      .from(cards)
      .where(eq(cards.noteId, note.id));
    if (cardRows.length > 0) {
      result.push({ ...note, card: cardRows[0] });
    }
  }

  return result;
}
