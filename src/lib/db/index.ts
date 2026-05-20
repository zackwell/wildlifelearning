import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (db) return db;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("未配置 DATABASE_URL。请在 .env.local 中填入 Neon 连接串。");
  }
  const sql = neon(url);
  db = drizzle(sql, { schema });
  return db;
}

export { schema };
