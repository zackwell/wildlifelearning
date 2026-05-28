"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SECRET = "test";
const RESET_MS = 4000;

export function AdminSecretShortcut() {
  const router = useRouter();
  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetBuffer() {
      bufferRef.current = "";
    }

    function scheduleReset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(resetBuffer, RESET_MS);
    }

    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return;

      bufferRef.current += e.key.toLowerCase();
      scheduleReset();

      if (bufferRef.current.endsWith(SECRET)) {
        resetBuffer();
        router.push("/admin/login");
      } else if (bufferRef.current.length > SECRET.length) {
        bufferRef.current = bufferRef.current.slice(-SECRET.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}
