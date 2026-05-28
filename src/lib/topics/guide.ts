import { loadUserPreferences, saveUserPreferences } from "@/lib/user-preferences";

export const TOPICS_GUIDE_SKIP_AUTO_KEY = "wl-topics-guide-skip-auto";

export function shouldSkipTopicsGuideAuto(): boolean {
  return loadUserPreferences().skipTopicsGuideAuto;
}

export function setSkipTopicsGuideAuto(skip: boolean): void {
  saveUserPreferences({ skipTopicsGuideAuto: skip });
}
