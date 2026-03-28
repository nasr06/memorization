import type {
  AnkiCollection,
  AnkiModel,
  ParsedAnkiData,
  AnkiNote,
  AnkiCard,
} from "./types";

export interface DeckToImport {
  ankiId: string;
  name: string;
  description: string;
}

export interface NoteTypeToImport {
  ankiModelId: string;
  name: string;
  fieldNames: string[];
  templates: Array<{ name: string; front: string; back: string }>;
  css: string;
  type: number;
}

export interface NoteToImport {
  ankiNoteId: number;
  ankiModelId: string;
  tags: string[];
  fields: Record<string, string>;
}

export interface CardToImport {
  ankiCardId: number;
  ankiNoteId: number;
  ankiDeckId: string;
  templateIndex: number;
  queue: number;
  due: number; // Unix timestamp in seconds
  interval: number; // days
  ease: number;
  reps: number;
  lapses: number;
}

export interface ParsedImportData {
  primaryDeck: DeckToImport;
  noteTypes: NoteTypeToImport[];
  notes: NoteToImport[];
  cards: CardToImport[];
}

function mapAnkiQueue(queue: number): number {
  switch (queue) {
    case 0:
      return 0; // new
    case 1:
    case 3:
      return 1; // learning / day-learning
    case 2:
      return 2; // review
    default:
      return -1; // suspended / buried
  }
}

function ankiDueToTimestamp(
  due: number,
  ivl: number,
  queue: number,
  crt: number
): number {
  const now = Math.floor(Date.now() / 1000);

  if (queue === 2 && ivl > 0) {
    // Review card: due is days since deck creation day
    const crtDay = Math.floor(crt / 86400);
    const todayDay = Math.floor(now / 86400);
    const daysFromNow = due - (todayDay - crtDay);
    return now + daysFromNow * 86400;
  }

  if (queue === 1 && due > 1_000_000_000) {
    // Learning card with future Unix timestamp
    return due;
  }

  // New cards and anything else: due immediately
  return now;
}

export function parseAnkiData(data: ParsedAnkiData): ParsedImportData {
  const { collection, notes, cards } = data;
  const { crt, models, decks } = collection;

  // Find primary deck: first non-Default, non-empty deck
  const deckList = Object.values(decks).filter(
    (d) => d.name !== "Default" && d.id !== "1"
  );
  const primaryAnkiDeck = deckList[0] ?? Object.values(decks)[0];

  const primaryDeck: DeckToImport = {
    ankiId: String(primaryAnkiDeck.id),
    name: primaryAnkiDeck.name.split("::").pop() ?? primaryAnkiDeck.name,
    description: primaryAnkiDeck.desc ?? "",
  };

  // Parse note types
  const noteTypes: NoteTypeToImport[] = Object.values(models).map(
    (model: AnkiModel) => ({
      ankiModelId: String(model.id),
      name: model.name,
      fieldNames: model.flds
        .sort((a, b) => a.ord - b.ord)
        .map((f) => f.name),
      templates: model.tmpls
        .sort((a, b) => a.ord - b.ord)
        .map((t) => ({ name: t.name, front: t.qfmt, back: t.afmt })),
      css: model.css ?? "",
      type: model.type ?? 0,
    })
  );

  // Build model lookup
  const modelMap: Record<string, AnkiModel> = {};
  Object.values(models).forEach((m) => {
    modelMap[String(m.id)] = m;
  });

  // Parse notes
  const parsedNotes: NoteToImport[] = notes.map((note: AnkiNote) => {
    const model = modelMap[String(note.mid)];
    const fieldValues = note.flds.split("\x1f");
    const fields: Record<string, string> = {};

    if (model) {
      model.flds
        .sort((a, b) => a.ord - b.ord)
        .forEach((field, i) => {
          fields[field.name] = fieldValues[i] ?? "";
        });
    } else {
      fieldValues.forEach((val, i) => {
        fields[`Field${i + 1}`] = val;
      });
    }

    return {
      ankiNoteId: note.id,
      ankiModelId: String(note.mid),
      tags: note.tags.trim().split(/\s+/).filter(Boolean),
      fields,
    };
  });

  // Parse cards
  const parsedCards: CardToImport[] = cards.map((card: AnkiCard) => ({
    ankiCardId: card.id,
    ankiNoteId: card.nid,
    ankiDeckId: String(card.odid || card.did),
    templateIndex: card.ord,
    queue: mapAnkiQueue(card.queue),
    due: ankiDueToTimestamp(card.due, card.ivl, card.queue, crt),
    interval: Math.max(1, Math.abs(card.ivl)),
    ease: card.factor > 0 ? card.factor / 1000 : 2.5,
    reps: card.reps,
    lapses: card.lapses,
  }));

  return { primaryDeck, noteTypes, notes: parsedNotes, cards: parsedCards };
}
