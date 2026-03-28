// On web, migrations are applied inside client.web.ts during sql.js init.
// This just waits for that to finish before the app renders.
import { webDbReady } from "./client";

export async function runMigrations(): Promise<void> {
  await webDbReady;
}
