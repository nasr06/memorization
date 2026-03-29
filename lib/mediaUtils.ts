// Native: returns the file:// base URL for a deck's media directory
import * as FileSystem from "expo-file-system";

export function getMediaBaseUrl(deckId: string): string | undefined {
  // documentDirectory already starts with file://, don't add it again
  return `${FileSystem.documentDirectory}media/${deckId}/`;
}
