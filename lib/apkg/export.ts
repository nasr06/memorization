import JSZip from "jszip";
import { Platform } from "react-native";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { decks, noteTypes, notes, cards } from "@/db/schema";
import { createAnkiDbBytes, type AnkiDbRow } from "./createAnkiDb";

function generateGuid(): string {
  return Math.random().toString(36).substring(2, 13);
}

// Simple checksum used by Anki (sum of char codes of first field)
function fieldChecksum(sfld: string): number {
  let csum = 0;
  for (let i = 0; i < Math.min(sfld.length, 9); i++) {
    csum += sfld.charCodeAt(i);
  }
  return csum;
}

export async function exportApkg(deckId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // Load deck
  const deckRows = await db.select().from(decks).where(eq(decks.id, deckId));
  const deck = deckRows[0];
  if (!deck) throw new Error("Deck not found");

  // Load note types
  const ntRows = await db
    .select()
    .from(noteTypes)
    .where(eq(noteTypes.deckId, deckId));

  // Load notes
  const noteRows = await db
    .select()
    .from(notes)
    .where(eq(notes.deckId, deckId));

  // Load cards
  const cardRows = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId));

  // Build Anki models JSON
  const ankiModels: Record<string, unknown> = {};
  const ntIdToAnkiId: Record<string, number> = {};
  ntRows.forEach((nt, idx) => {
    const ankiId = now + idx;
    ntIdToAnkiId[nt.id] = ankiId;

    let fieldNames: string[] = ["Front", "Back"];
    let templates: Array<{ name: string; front: string; back: string }> = [
      { name: "Card 1", front: "{{Front}}", back: "{{Back}}" },
    ];
    try {
      fieldNames = JSON.parse(nt.fields ?? "[]");
    } catch {}
    try {
      templates = JSON.parse(nt.templates ?? "[]");
    } catch {}

    ankiModels[String(ankiId)] = {
      id: ankiId,
      name: nt.name ?? "Basic",
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: null,
      tmpls: templates.map((t, i) => ({
        name: t.name,
        ord: i,
        qfmt: t.front,
        afmt: t.back,
        bqfmt: "",
        bafmt: "",
        did: null,
        bfont: "",
        bsize: 0,
        id: null,
      })),
      flds: fieldNames.map((name, i) => ({
        name,
        ord: i,
        sticky: false,
        rtl: false,
        font: "Arial",
        size: 20,
        description: "",
        plainText: false,
        collapsed: false,
        excludeFromSearch: false,
        id: null,
        tag: null,
        preventDeletion: false,
      })),
      css: nt.css ?? ".card { font-family: arial; font-size: 20px; text-align: center; }",
      latexPre:
        "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
      latexPost: "\\end{document}",
      latexsvg: false,
      req: [[0, "any", [0]]],
      originalStockKind: 1,
    };
  });

  // Fallback model if no note types
  const defaultModelId = now + 9999;
  if (Object.keys(ankiModels).length === 0) {
    ankiModels[String(defaultModelId)] = {
      id: defaultModelId,
      name: "Basic",
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: null,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Front}}",
          afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
          bqfmt: "",
          bafmt: "",
          did: null,
          bfont: "",
          bsize: 0,
          id: null,
        },
      ],
      flds: [
        { name: "Front", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20 },
        { name: "Back", ord: 1, sticky: false, rtl: false, font: "Arial", size: 20 },
      ],
      css: ".card { font-family: arial; font-size: 20px; text-align: center; }",
      latexPre: "",
      latexPost: "",
      latexsvg: false,
      req: [[0, "any", [0]]],
      originalStockKind: 1,
    };
  }

  // Build Anki decks JSON
  const ankiDeckId = now + 1;
  const ankiDecks: Record<string, unknown> = {
    "1": {
      id: 1,
      mod: now,
      name: "Default",
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: true,
      browserCollapsed: true,
      desc: "",
      dyn: 0,
      conf: 1,
      extendNew: 0,
      extendRev: 50,
    },
    [String(ankiDeckId)]: {
      id: ankiDeckId,
      mod: now,
      name: deck.name,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: deck.description ?? "",
      dyn: 0,
      conf: 1,
      extendNew: 0,
      extendRev: 50,
    },
  };

  const dconf = {
    "1": {
      id: 1,
      mod: now,
      name: "Default",
      usn: -1,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 },
      lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
      rev: { bury: true, ease4: 1.3, fuzz: 0.05, hardFactor: 1.2, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 200 },
    },
  };

  // Build rows for Anki DB
  const dbRows: AnkiDbRow[] = [];

  // col row
  dbRows.push({
    table: "col",
    params: [
      1,
      now,
      now,
      now * 1000,
      11,
      0,
      -1,
      0,
      JSON.stringify({ activeDecks: [ankiDeckId], curDeck: ankiDeckId, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: null, nextPos: 1, sortType: "noteFld", sortBackwards: false, addToCur: true, dayLearnFirst: false, schedVer: 2 }),
      JSON.stringify(ankiModels),
      JSON.stringify(ankiDecks),
      JSON.stringify(dconf),
      "{}",
    ],
  });

  // notes rows
  const noteIdMap: Record<string, number> = {};
  noteRows.forEach((note, idx) => {
    const ankiNoteId = now * 1000 + idx;
    noteIdMap[note.id] = ankiNoteId;

    let fields: Record<string, string> = {};
    try {
      fields = JSON.parse(note.fields ?? "{}");
    } catch {}

    const flds = Object.values(fields).join("\x1f");
    const sfld = Object.values(fields)[0] ?? "";
    const mid = note.noteTypeId ? (ntIdToAnkiId[note.noteTypeId] ?? defaultModelId) : defaultModelId;

    dbRows.push({
      table: "notes",
      params: [
        ankiNoteId,
        generateGuid(),
        mid,
        now,
        -1,
        (JSON.parse(note.tags ?? "[]") as string[]).join(" "),
        flds,
        sfld,
        fieldChecksum(sfld),
        0,
        "",
      ],
    });
  });

  // cards rows
  cardRows.forEach((card, idx) => {
    const ankiNoteId = noteIdMap[card.noteId ?? ""];
    if (ankiNoteId === undefined) return;

    dbRows.push({
      table: "cards",
      params: [
        now * 1000 + idx,
        ankiNoteId,
        ankiDeckId,
        card.templateIndex ?? 0,
        now,
        -1,
        card.queue === 2 ? 2 : 0,
        card.queue ?? 0,
        card.queue === 2 ? Math.floor((card.due ?? now) / 86400) : 0,
        card.interval ?? 1,
        Math.round((card.ease ?? 2.5) * 1000),
        card.reps ?? 0,
        card.lapses ?? 0,
        0,
        0,
        0,
        0,
        "",
      ],
    });
  });

  // Build the SQLite bytes
  const sqliteBytes = await createAnkiDbBytes(dbRows);

  // Collect media files for this deck
  const mediaMap: Record<string, string> = {};
  let mediaIndex = 0;
  const zip = new JSZip();

  if (Platform.OS !== "web") {
    const FileSystem = await import("expo-file-system");
    const mediaDir = FileSystem.documentDirectory + `media/${deckId}/`;
    try {
      const mediaFiles = await FileSystem.readDirectoryAsync(mediaDir);
      for (const filename of mediaFiles) {
        const filePath = mediaDir + filename;
        const fileBase64 = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binary = atob(fileBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        zip.file(String(mediaIndex), bytes);
        mediaMap[String(mediaIndex)] = filename;
        mediaIndex++;
      }
    } catch {
      // No media directory is fine
    }
  }

  zip.file("collection.anki2", sqliteBytes);
  zip.file("media", JSON.stringify(mediaMap));

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  const safeFilename = deck.name.replace(/[^a-z0-9]/gi, "_") + ".apkg";

  if (Platform.OS === "web") {
    // Browser download
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFilename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const FileSystem = await import("expo-file-system");
    const Sharing = await import("expo-sharing");

    const exportPath = FileSystem.cacheDirectory + safeFilename;
    let binary = "";
    for (let i = 0; i < zipBytes.byteLength; i++) {
      binary += String.fromCharCode(zipBytes[i]);
    }
    await FileSystem.writeAsStringAsync(exportPath, btoa(binary), {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(exportPath, {
        mimeType: "application/zip",
        dialogTitle: `Export ${deck.name}`,
        UTI: "org.anki.apkg",
      });
    }
  }
}
