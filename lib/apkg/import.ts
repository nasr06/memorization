import JSZip from "jszip";
import { Platform } from "react-native";
import { db } from "@/db/client";
import { decks, noteTypes, notes, cards } from "@/db/schema";
import { addXPToStreak } from "@/db/queries/streak";
import { readAnkiDb } from "./ankiReader";
import { parseAnkiData } from "./parser";
import type { ImportResult, ImportProgress } from "./types";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Reads a file URI to bytes. On web, uses fetch (blob/data URLs); on native, uses expo-file-system. */
async function readFileToBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
  // Native path — import lazily so web bundle never includes FileSystem
  const FileSystem = await import("expo-file-system");
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToUint8Array(base64);
}

/** Writes bytes to a local path. No-op on web (media not supported). */
async function writeMediaFile(path: string, bytes: Uint8Array): Promise<void> {
  if (Platform.OS === "web") return;
  const FileSystem = await import("expo-file-system");
  await FileSystem.writeAsStringAsync(path, uint8ArrayToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Returns the media directory for a deck, or null on web. */
async function getMediaDir(deckId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const FileSystem = await import("expo-file-system");
  const dir = FileSystem.documentDirectory + `media/${deckId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return dir;
}

const BATCH_SIZE = 500;

export async function importApkg(
  fileUri: string,
  onProgress?: (p: ImportProgress) => void
): Promise<ImportResult> {
  const report = (
    stage: ImportProgress["stage"],
    progress: number,
    message: string
  ) => onProgress?.({ stage, progress, message });

  try {
    report("extracting", 0.05, "Reading file...");

    const fileBytes = await readFileToBytes(fileUri);

    report("extracting", 0.15, "Extracting archive...");

    const zip = await JSZip.loadAsync(fileBytes);

    // Anki 2.1 uses collection.anki21, older uses collection.anki2
    const dbFile =
      zip.file("collection.anki21") ?? zip.file("collection.anki2");
    if (!dbFile) {
      throw new Error(
        "No Anki collection found in file. Make sure it is a valid .apkg file."
      );
    }

    const dbBytes = await dbFile.async("uint8array");

    // Parse media manifest (maps numeric filenames to original names)
    const mediaFile = zip.file("media");
    let mediaMap: Record<string, string> = {};
    if (mediaFile) {
      try {
        mediaMap = JSON.parse(await mediaFile.async("string"));
      } catch {}
    }

    report("parsing", 0.3, "Parsing Anki data...");

    const rawData = await readAnkiDb(dbBytes);
    const { primaryDeck, noteTypes: ankiNoteTypes, notes: ankiNotes, cards: ankiCards } =
      parseAnkiData(rawData);

    report(
      "importing",
      0.4,
      `Importing ${ankiNotes.length} notes and ${ankiCards.length} cards...`
    );

    const now = Math.floor(Date.now() / 1000);
    const deckId = crypto.randomUUID();

    // 1. Create the deck
    await db.insert(decks).values({
      id: deckId,
      name: primaryDeck.name,
      description: primaryDeck.description || null,
      coverColor: "#6C63FF",
      coverEmoji: "📦",
      ankiId: primaryDeck.ankiId,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create note types
    const noteTypeIdMap: Record<string, string> = {};
    for (const nt of ankiNoteTypes) {
      const ntId = crypto.randomUUID();
      noteTypeIdMap[nt.ankiModelId] = ntId;
      await db.insert(noteTypes).values({
        id: ntId,
        deckId,
        name: nt.name,
        fields: JSON.stringify(nt.fieldNames),
        templates: JSON.stringify(nt.templates),
        css: nt.css || null,
      });
    }

    // 3. Create notes in batches
    const noteIdMap: Record<number, string> = {};
    const noteRows = ankiNotes.map((n) => {
      const noteId = crypto.randomUUID();
      noteIdMap[n.ankiNoteId] = noteId;
      return {
        id: noteId,
        deckId,
        noteTypeId: noteTypeIdMap[n.ankiModelId] ?? null,
        fields: JSON.stringify(n.fields),
        tags: JSON.stringify(n.tags),
        createdAt: now,
        updatedAt: now,
      };
    });

    for (let i = 0; i < noteRows.length; i += BATCH_SIZE) {
      await db.insert(notes).values(noteRows.slice(i, i + BATCH_SIZE));
      report(
        "importing",
        0.4 + 0.2 * (i / Math.max(noteRows.length, 1)),
        `Importing notes... ${Math.min(i + BATCH_SIZE, noteRows.length)}/${noteRows.length}`
      );
    }

    // 4. Create cards in batches
    const cardRows = ankiCards
      .filter((c) => noteIdMap[c.ankiNoteId] !== undefined)
      .map((c) => ({
        id: crypto.randomUUID(),
        noteId: noteIdMap[c.ankiNoteId],
        deckId,
        templateIndex: c.templateIndex,
        due: c.due,
        interval: c.interval,
        ease: c.ease,
        reps: c.reps,
        lapses: c.lapses,
        queue: c.queue,
        createdAt: now,
        updatedAt: now,
      }));

    for (let i = 0; i < cardRows.length; i += BATCH_SIZE) {
      await db.insert(cards).values(cardRows.slice(i, i + BATCH_SIZE));
      report(
        "importing",
        0.6 + 0.2 * (i / Math.max(cardRows.length, 1)),
        `Importing cards... ${Math.min(i + BATCH_SIZE, cardRows.length)}/${cardRows.length}`
      );
    }

    // 5. Copy media files (native only — web skips media storage)
    report("media", 0.8, "Copying media...");
    let mediaCount = 0;
    const mediaEntries = Object.entries(mediaMap);

    if (mediaEntries.length > 0) {
      const mediaDir = await getMediaDir(deckId);

      for (let i = 0; i < mediaEntries.length; i++) {
        const [numericName, originalName] = mediaEntries[i];
        const file = zip.file(numericName);
        if (file && mediaDir) {
          const bytes = await file.async("uint8array");
          await writeMediaFile(mediaDir + originalName, bytes);
          mediaCount++;
        }
        report(
          "media",
          0.8 + 0.15 * ((i + 1) / mediaEntries.length),
          `Copying media... ${i + 1}/${mediaEntries.length}`
        );
      }
    }

    // 6. Award XP for importing
    await addXPToStreak(20);

    report("done", 1, "Import complete!");

    return {
      success: true,
      deckId,
      deckName: primaryDeck.name,
      noteCount: ankiNotes.length,
      cardCount: cardRows.length,
      mediaCount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during import";
    console.error("importApkg error:", error);
    return {
      success: false,
      deckId: "",
      deckName: "",
      noteCount: 0,
      cardCount: 0,
      mediaCount: 0,
      error: message,
    };
  }
}
