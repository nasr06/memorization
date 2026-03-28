// Web: creates an Anki-compatible SQLite file in-memory using sql.js.
import type { AnkiDbRow } from "./createAnkiDb";

type SqlJsStatic = {
  Database: new (data?: Uint8Array) => SqlDatabase;
};

type SqlDatabase = {
  run(sql: string, params?: unknown[]): void;
  export(): Uint8Array;
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
  const SQL = await getSqlJs();
  const db = new SQL.Database();

  db.run(ANKI_SCHEMA);

  for (const row of rows) {
    const sql = INSERT_SQL[row.table];
    if (sql) {
      db.run(sql, row.params);
    }
  }

  const bytes = db.export();
  db.close();
  return bytes;
}
