import { getAdminAllowedIps } from "@/lib/admin/config";
import {
  adminIpBlockMessage,
  clientIp,
  ipMatchesAllowlist,
} from "@/lib/admin/client-ip";

export function isAdminIpAllowed(req: Request): boolean {
  const allowed = getAdminAllowedIps();
  if (!allowed.length) return true;
  const ip = clientIp(req);
  return ipMatchesAllowlist(ip, allowed);
}

export function adminIpDeniedMessage(req: Request): string {
  const allowed = getAdminAllowedIps();
  return adminIpBlockMessage(clientIp(req), allowed);
}
