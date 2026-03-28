// Native: returns the file:// base URL for a deck's media directory
import * as FileSystem from "expo-file-system";

export function getMediaBaseUrl(deckId: string): string | undefined {
  return `file://${FileSystem.documentDirectory}media/${deckId}/`;
}
