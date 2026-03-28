const DB_NAME = "anki_media";
const STORE = "files";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMedia(
  deckId: string,
  filename: string,
  bytes: Uint8Array
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(bytes, `${deckId}/${filename}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resolveMediaUrl(
  deckId: string,
  filename: string
): Promise<string | null> {
  const db = await openDB();
  const bytes = await new Promise<Uint8Array | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(`${deckId}/${filename}`);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!bytes) return null;
  const blob = new Blob([bytes], { type: guessMime(filename) });
  return URL.createObjectURL(blob);
}

function guessMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return map[ext] ?? "application/octet-stream";
}
