import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _instance: DrizzleDB | null = null;

function getInstance(): DrizzleDB {
  if (!_instance) {
    const expo = SQLite.openDatabaseSync("recall.db", {
      enableChangeListener: true,
    });
    _instance = drizzle(expo, { schema });
  }
  return _instance;
}

// Lazy proxy — openDatabaseSync is deferred until first DB call at runtime,
// avoiding the crash when the native SQLite module isn't available during SSR.
export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    return getInstance()[prop as keyof DrizzleDB];
  },
});

export type DB = DrizzleDB;
