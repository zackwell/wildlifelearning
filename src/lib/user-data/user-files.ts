import fs from "node:fs";
import path from "node:path";

export function deleteUserDataDir(userId: string): void {
  const dir = path.join(process.cwd(), "data", "users", userId);
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}
