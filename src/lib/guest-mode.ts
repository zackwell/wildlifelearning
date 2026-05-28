const GUEST_MODE_KEY = "wl-guest-mode";

export function isGuestModePreferred(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(GUEST_MODE_KEY) === "1";
}

export function setGuestModePreferred(on: boolean): void {
  if (typeof window === "undefined") return;
  if (on) sessionStorage.setItem(GUEST_MODE_KEY, "1");
  else sessionStorage.removeItem(GUEST_MODE_KEY);
}

export function clearGuestModePreferred(): void {
  setGuestModePreferred(false);
}

/** 以游客身份进入：清除登录会话并标记仅使用本机数据 */
export async function enterGuestMode(): Promise<void> {
  setGuestModePreferred(true);
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    /* 仍按游客模式继续 */
  }
}

export function shouldUseCloudData(): boolean {
  return !isGuestModePreferred();
}
