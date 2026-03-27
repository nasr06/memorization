import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

const expo = SQLite.openDatabaseSync("recall.db", {
  enableChangeListener: true,
});

export const db = drizzle(expo, { schema });
export type DB = typeof db;
