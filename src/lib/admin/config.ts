import { timingSafeEqual } from "node:crypto";

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_USERNAME?.trim() && process.env.ADMIN_PASSWORD?.trim(),
  );
}

export function getAdminUsername(): string | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  return username || null;
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  const expectedUser = getAdminUsername();
  const expectedPass = process.env.ADMIN_PASSWORD?.trim();
  if (!expectedUser || !expectedPass) return false;
  if (username.trim() !== expectedUser) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(expectedPass);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getAdminSigningSecret(): string {
  return (
    process.env.ADMIN_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "wl-admin-dev-only-change-me"
  );
}

export function getAdminAllowedIps(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
