// Native Anki SQLite reader.
// Writes the .anki2 bytes to a temp file in the expo-sqlite directory,
// opens it with expo-sqlite, reads all data, then deletes the temp file.
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import type { ParsedAnkiData, AnkiNote, AnkiCard } from "./types";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function readAnkiDb(dbBytes: Uint8Array): Promise<ParsedAnkiData> {
  const tempName = `anki_import_${Date.now()}.db`;
  const sqliteDir = FileSystem.documentDirectory + "SQLite/";
  const tempPath = sqliteDir + tempName;

  // Ensure SQLite directory exists
  await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });

  // Write Anki SQLite bytes to temp file
  await FileSystem.writeAsStringAsync(tempPath, uint8ArrayToBase64(dbBytes), {
    encoding: FileSystem.EncodingType.Base64,
  });

  let db: SQLite.SQLiteDatabase | null = null;

  try {
    db = await SQLite.openDatabaseAsync(tempName);

    // Read collection metadata
    const colRows = await db.getAllAsync<{
      crt: number;
      models: string;
      decks: string;
    }>("SELECT crt, models, decks FROM col LIMIT 1");

    const col = colRows[0];
    if (!col) throw new Error("Invalid Anki database: missing col table");

    // Read all notes
    const notes = await db.getAllAsync<AnkiNote>(
      "SELECT id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data FROM notes"
    );

    // Read all cards
    const cards = await db.getAllAsync<AnkiCard>(
      "SELECT id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data FROM cards"
    );

    return {
      collection: {
        crt: col.crt,
        models: JSON.parse(col.models),
        decks: JSON.parse(col.decks),
      },
      notes,
      cards,
    };
  } finally {
    try {
      await db?.closeAsync();
    } catch {}
    // Clean up temp files (including WAL/SHM if created)
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    await FileSystem.deleteAsync(tempPath + "-wal", { idempotent: true });
    await FileSystem.deleteAsync(tempPath + "-shm", { idempotent: true });
  }
}
