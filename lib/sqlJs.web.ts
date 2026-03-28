// Singleton sql.js initializer — ensures only one WASM heap is ever created.
// Both the app DB (db/client.web.ts) and the Anki reader (lib/apkg/ankiReader.web.ts)
// must share this instance so the browser doesn't allocate two ~256 MB heaps.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSqlJs(): Promise<any> {
  if (!_instance) {
    _instance = (import("sql.js/dist/sql-asm.js") as Promise<any>).then(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.default()
    );
  }
  return _instance;
}
