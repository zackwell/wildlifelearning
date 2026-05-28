"use client";

import { useEffect } from "react";
import { applyColorScheme, loadUserPreferences } from "@/lib/user-preferences";

export function ThemeProvider() {
  useEffect(() => {
    applyColorScheme(loadUserPreferences().colorScheme);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (loadUserPreferences().colorScheme === "system") {
        applyColorScheme("system");
      }
    };

    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  return null;
}
