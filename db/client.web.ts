// Web SQLite client — uses sql.js (in-memory, no native module required).
// Data does not persist between page reloads.
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// Migration SQL embedded directly (avoids asset import issues on web).
// Keep in sync with db/migrations/ when new migrations are added.
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS \`cards\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`note_id\` text,
  \`deck_id\` text,
  \`template_index\` integer DEFAULT 0,
  \`due\` integer,
  \`interval\` integer DEFAULT 1,
  \`ease\` real DEFAULT 2.5,
  \`reps\` integer DEFAULT 0,
  \`lapses\` integer DEFAULT 0,
  \`queue\` integer DEFAULT 0,
  \`created_at\` integer,
  \`updated_at\` integer
);
CREATE TABLE IF NOT EXISTS \`decks\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`cover_color\` text,
  \`cover_emoji\` text,
  \`is_public\` integer DEFAULT 0,
  \`anki_id\` text,
  \`created_at\` integer,
  \`updated_at\` integer,
  \`synced_at\` integer
);
CREATE TABLE IF NOT EXISTS \`note_types\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`deck_id\` text,
  \`name\` text,
  \`fields\` text,
  \`templates\` text,
  \`css\` text
);
CREATE TABLE IF NOT EXISTS \`notes\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`deck_id\` text,
  \`note_type_id\` text,
  \`fields\` text,
  \`tags\` text,
  \`created_at\` integer,
  \`updated_at\` integer
);
CREATE TABLE IF NOT EXISTS \`review_log\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`card_id\` text,
  \`rating\` integer,
  \`time_taken\` integer,
  \`prev_due\` integer,
  \`prev_ease\` real,
  \`reviewed_at\` integer
);
CREATE TABLE IF NOT EXISTS \`settings\` (
  \`key\` text PRIMARY KEY NOT NULL,
  \`value\` text
);
CREATE TABLE IF NOT EXISTS \`streak\` (
  \`id\` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
  \`current_streak\` integer DEFAULT 0,
  \`longest_streak\` integer DEFAULT 0,
  \`last_study_date\` text,
  \`streak_freezes\` integer DEFAULT 0,
  \`total_xp\` integer DEFAULT 0,
  \`weekly_xp\` integer DEFAULT 0,
  \`week_start_date\` text,
  \`updated_at\` integer
);
`;

let _db: DrizzleDB | null = null;

// Eagerly start initialization; resolved before any query runs
// because _layout.tsx awaits runMigrations() (see migrate.web.ts).
export const webDbReady: Promise<void> = (async () => {
  const { default: initSqlJs } = await import("sql.js/dist/sql-asm.js");
  const SQL = await initSqlJs();
  const sqlDb = new SQL.Database();
  sqlDb.run(MIGRATION_SQL);
  _db = drizzle(sqlDb, { schema });
})();

export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    if (!_db) {
      throw new Error(
        "Web DB accessed before initialization. Ensure runMigrations() has completed."
      );
    }
    return (_db as DrizzleDB)[prop as keyof DrizzleDB];
  },
});

export type DB = DrizzleDB;
