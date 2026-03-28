// Web Anki SQLite reader — uses sql.js asm.js (same as the web DB client).
// No WASM file needed; the asm.js build is pure JavaScript.
import type { ParsedAnkiData, AnkiNote, AnkiCard } from "./types";

type SqlJsStatic = {
  Database: new (data?: Uint8Array) => SqlDatabase;
};

type SqlDatabase = {
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  close(): void;
};

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = import("sql.js/dist/sql-asm.js").then(
      (m) => m.default() as Promise<SqlJsStatic>
    );
  }
  return sqlJsPromise;
}

function rowsToObjects<T>(result: {
  columns: string[];
  values: unknown[][];
}): T[] {
  return result.values.map((row) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

export async function readAnkiDb(dbBytes: Uint8Array): Promise<ParsedAnkiData> {
  const SQL = await getSqlJs();
  const db = new SQL.Database(dbBytes);

  try {
    const colResults = db.exec("SELECT crt, models, decks FROM col LIMIT 1");
    const colRow = colResults[0]?.values[0];
    if (!colRow) throw new Error("Invalid Anki database: missing col table");
    const [crt, modelsJson, decksJson] = colRow as [number, string, string];

    const notesResult = db.exec(
      "SELECT id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data FROM notes"
    );
    const notes = notesResult[0]
      ? rowsToObjects<AnkiNote>(notesResult[0])
      : [];

    const cardsResult = db.exec(
      "SELECT id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data FROM cards"
    );
    const cards = cardsResult[0]
      ? rowsToObjects<AnkiCard>(cardsResult[0])
      : [];

    return {
      collection: {
        crt,
        models: JSON.parse(modelsJson),
        decks: JSON.parse(decksJson),
      },
      notes,
      cards,
    };
  } finally {
    db.close();
  }
}
