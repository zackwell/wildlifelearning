import { ADMIN_LOGIN_MAX_PER_WINDOW, ADMIN_LOGIN_WINDOW_MS } from "@/lib/admin/constants";
import { clientIp } from "@/lib/admin/client-ip";

export { clientIp };

const buckets = new Map<string, number[]>();

export function allowAdminLogin(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - ADMIN_LOGIN_WINDOW_MS;
  const hits = (buckets.get(ip) ?? []).filter((t) => t > windowStart);
  if (hits.length >= ADMIN_LOGIN_MAX_PER_WINDOW) return false;
  hits.push(now);
  buckets.set(ip, hits);
  return true;
}
