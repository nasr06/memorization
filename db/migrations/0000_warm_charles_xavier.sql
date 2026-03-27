CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text,
	`deck_id` text,
	`template_index` integer DEFAULT 0,
	`due` integer,
	`interval` integer DEFAULT 1,
	`ease` real DEFAULT 2.5,
	`reps` integer DEFAULT 0,
	`lapses` integer DEFAULT 0,
	`queue` integer DEFAULT 0,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`cover_color` text,
	`cover_emoji` text,
	`is_public` integer DEFAULT 0,
	`anki_id` text,
	`created_at` integer,
	`updated_at` integer,
	`synced_at` integer
);
--> statement-breakpoint
CREATE TABLE `note_types` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text,
	`name` text,
	`fields` text,
	`templates` text,
	`css` text,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text,
	`note_type_id` text,
	`fields` text,
	`tags` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`note_type_id`) REFERENCES `note_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_log` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text,
	`rating` integer,
	`time_taken` integer,
	`prev_due` integer,
	`prev_ease` real,
	`reviewed_at` integer,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `streak` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`current_streak` integer DEFAULT 0,
	`longest_streak` integer DEFAULT 0,
	`last_study_date` text,
	`streak_freezes` integer DEFAULT 0,
	`total_xp` integer DEFAULT 0,
	`weekly_xp` integer DEFAULT 0,
	`week_start_date` text,
	`updated_at` integer
);
