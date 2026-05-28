/** 将 ::1、IPv4-mapped 等归一为便于白名单匹配的地址 */
export function normalizeIp(ip: string): string {
  const t = ip.trim().toLowerCase();
  if (!t || t === "unknown") return t;
  if (t === "::1" || t === "0:0:0:0:0:0:0:1") return "127.0.0.1";
  if (t.startsWith("::ffff:")) return t.slice(7);
  return t;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);
  return "unknown";
}

export function ipMatchesAllowlist(client: string, allowed: string[]): boolean {
  const normalizedClient = normalizeIp(client);
  const normalizedAllowed = allowed.map(normalizeIp);
  if (normalizedClient !== "unknown" && normalizedAllowed.includes(normalizedClient)) {
    return true;
  }
  // 本机访问时常见 ::1 / unknown，白名单含 127.0.0.1 时一并放行
  if (
    normalizedAllowed.includes("127.0.0.1") &&
    (normalizedClient === "unknown" ||
      normalizedClient === "127.0.0.1" ||
      client === "::1")
  ) {
    return true;
  }
  return false;
}

export function adminIpBlockMessage(client: string, allowed: string[]): string {
  const shown = client === "unknown" ? "unknown（未识别，直连 Node 时常见）" : client;
  return `当前 IP（${shown}）不在 ADMIN_ALLOWED_IPS 白名单内。请删除该环境变量（不限制 IP），或在白名单中加入此 IP。当前白名单：${allowed.join(", ")}`;
}
