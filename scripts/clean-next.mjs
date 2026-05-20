import { rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".next");
try {
  rmSync(dir, { recursive: true, force: true });
  console.log("[clean] 已删除 .next 缓存");
} catch (e) {
  console.warn("[clean] 删除 .next 时出现问题（可能不存在或仍被占用）:", e.message);
}
