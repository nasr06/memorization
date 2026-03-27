import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  coverColor: text("cover_color"),
  coverEmoji: text("cover_emoji"),
  isPublic: integer("is_public").default(0),
  ankiId: text("anki_id"),
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
  syncedAt: integer("synced_at"),
});

export const noteTypes = sqliteTable("note_types", {
  id: text("id").primaryKey(),
  deckId: text("deck_id").references(() => decks.id),
  name: text("name"),
  fields: text("fields"), // JSON array of field names
  templates: text("templates"), // JSON array of {front, back}
  css: text("css"),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  deckId: text("deck_id").references(() => decks.id),
  noteTypeId: text("note_type_id").references(() => noteTypes.id),
  fields: text("fields"), // JSON: {fieldName: value}
  tags: text("tags"), // JSON array
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  noteId: text("note_id").references(() => notes.id),
  deckId: text("deck_id").references(() => decks.id),
  templateIndex: integer("template_index").default(0),
  due: integer("due"),
  interval: integer("interval").default(1),
  ease: real("ease").default(2.5),
  reps: integer("reps").default(0),
  lapses: integer("lapses").default(0),
  queue: integer("queue").default(0), // 0=new, 1=learning, 2=review, -1=suspended
  createdAt: integer("created_at"),
  updatedAt: integer("updated_at"),
});

export const reviewLog = sqliteTable("review_log", {
  id: text("id").primaryKey(),
  cardId: text("card_id").references(() => cards.id),
  rating: integer("rating"), // 1=Again, 2=Hard, 3=Good, 4=Easy
  timeTaken: integer("time_taken"), // ms
  prevDue: integer("prev_due"),
  prevEase: real("prev_ease"),
  reviewedAt: integer("reviewed_at"),
});

export const streak = sqliteTable("streak", {
  id: text("id").primaryKey().default("singleton"),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastStudyDate: text("last_study_date"),
  streakFreezes: integer("streak_freezes").default(0),
  totalXP: integer("total_xp").default(0),
  weeklyXP: integer("weekly_xp").default(0),
  weekStartDate: text("week_start_date"),
  updatedAt: integer("updated_at"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export type Deck = typeof decks.$inferSelect;
export type NewDeck = typeof decks.$inferInsert;
export type NoteType = typeof noteTypes.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type ReviewLog = typeof reviewLog.$inferSelect;
export type NewReviewLog = typeof reviewLog.$inferInsert;
export type Streak = typeof streak.$inferSelect;
