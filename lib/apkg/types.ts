// Anki internal data structures (from collection.anki2 SQLite)

export interface AnkiField {
  name: string;
  ord: number;
  font?: string;
  size?: number;
  rtl?: boolean;
}

export interface AnkiTemplate {
  name: string;
  ord: number;
  qfmt: string; // question (front) template
  afmt: string; // answer (back) template
  did?: number | null;
  bqfmt?: string;
  bafmt?: string;
}

export interface AnkiModel {
  id: string;
  name: string;
  type: number; // 0=standard, 1=cloze
  flds: AnkiField[];
  tmpls: AnkiTemplate[];
  css: string;
  sortf?: number;
}

export interface AnkiDeck {
  id: string;
  name: string;
  desc: string;
  conf?: number;
  dyn?: number;
}

export interface AnkiCollection {
  crt: number; // collection creation Unix timestamp
  models: Record<string, AnkiModel>;
  decks: Record<string, AnkiDeck>;
}

export interface AnkiNote {
  id: number;
  guid: string;
  mid: number; // model (note type) id
  mod: number;
  usn: number;
  tags: string;
  flds: string; // fields separated by \x1f
  sfld: string;
  csum: number;
  flags: number;
  data: string;
}

export interface AnkiCard {
  id: number;
  nid: number; // note id
  did: number; // deck id
  ord: number; // template index
  mod: number;
  usn: number;
  type: number;
  queue: number; // 0=new, 1=learning, 2=review, -1=suspended, 3=day-learning
  due: number;
  ivl: number; // interval in days (negative = seconds for learning)
  factor: number; // ease * 1000
  reps: number;
  lapses: number;
  left: number;
  odue: number;
  odid: number;
  flags: number;
  data: string;
}

export interface ParsedAnkiData {
  collection: AnkiCollection;
  notes: AnkiNote[];
  cards: AnkiCard[];
}

export interface ImportResult {
  success: boolean;
  deckId: string;
  deckName: string;
  noteCount: number;
  cardCount: number;
  mediaCount: number;
  error?: string;
}

export type ImportStage = "extracting" | "parsing" | "importing" | "media" | "done";

export interface ImportProgress {
  stage: ImportStage;
  progress: number; // 0 to 1
  message: string;
}
