// Native stub — media is handled via expo-file-system in import.ts directly

export async function saveMedia(
  _deckId: string,
  _filename: string,
  _bytes: Uint8Array
): Promise<void> {}

export async function resolveMediaUrl(
  _deckId: string,
  _filename: string
): Promise<string | null> {
  return null;
}
