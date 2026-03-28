// Native: creates an Anki-compatible SQLite file using expo-sqlite,
// then reads the bytes back for packaging into a .apkg zip.
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";

export interface AnkiDbRow {
  table: string;
  params: (string | number | null)[];
}

const ANKI_SCHEMA = `
CREATE TABLE IF NOT EXISTS col (
  id integer PRIMARY KEY,
  crt integer NOT NULL,
  mod integer NOT NULL,
  scm integer NOT NULL,
  ver integer NOT NULL,
  dty integer NOT NULL,
  usn integer NOT NULL,
  ls integer NOT NULL,
  conf text NOT NULL,
  models text NOT NULL,
  decks text NOT NULL,
  dconf text NOT NULL,
  tags text NOT NULL
);
CREATE TABLE IF NOT EXISTS notes (
  id integer PRIMARY KEY,
  guid text NOT NULL,
  mid integer NOT NULL,
  mod integer NOT NULL,
  usn integer NOT NULL,
  tags text NOT NULL,
  flds text NOT NULL,
  sfld integer NOT NULL,
  csum integer NOT NULL,
  flags integer NOT NULL,
  data text NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  id integer PRIMARY KEY,
  nid integer NOT NULL,
  did integer NOT NULL,
  ord integer NOT NULL,
  mod integer NOT NULL,
  usn integer NOT NULL,
  type integer NOT NULL,
  queue integer NOT NULL,
  due integer NOT NULL,
  ivl integer NOT NULL,
  factor integer NOT NULL,
  reps integer NOT NULL,
  lapses integer NOT NULL,
  left integer NOT NULL,
  odue integer NOT NULL,
  odid integer NOT NULL,
  flags integer NOT NULL,
  data text NOT NULL
);
CREATE TABLE IF NOT EXISTS revlog (
  id integer PRIMARY KEY,
  cid integer NOT NULL,
  usn integer NOT NULL,
  ease integer NOT NULL,
  ivl integer NOT NULL,
  lastIvl integer NOT NULL,
  factor integer NOT NULL,
  time integer NOT NULL,
  type integer NOT NULL
);
CREATE TABLE IF NOT EXISTS graves (
  usn integer NOT NULL,
  oid integer NOT NULL,
  type integer NOT NULL
);
`;

const INSERT_SQL: Record<string, string> = {
  col: "INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  notes:
    "INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  cards:
    "INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
};

export async function createAnkiDbBytes(rows: AnkiDbRow[]): Promise<Uint8Array> {
  const tempName = `anki_export_${Date.now()}.db`;
  const sqliteDir = FileSystem.documentDirectory + "SQLite/";
  const tempPath = sqliteDir + tempName;

  await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });

  const db = await SQLite.openDatabaseAsync(tempName);

  try {
    await db.execAsync(ANKI_SCHEMA);

    await db.withExclusiveTransactionAsync(async (txDb) => {
      for (const row of rows) {
        const sql = INSERT_SQL[row.table];
        if (sql) {
          await txDb.runAsync(sql, row.params);
        }
      }
    });
  } finally {
    await db.closeAsync();
  }

  // Read the database file back as bytes
  const base64 = await FileSystem.readAsStringAsync(tempPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Clean up temp files
  await FileSystem.deleteAsync(tempPath, { idempotent: true });
  await FileSystem.deleteAsync(tempPath + "-wal", { idempotent: true });
  await FileSystem.deleteAsync(tempPath + "-shm", { idempotent: true });

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
