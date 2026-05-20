"use client";

import { useEffect, useRef } from "react";
import {
  readLocalFieldGuideEntriesForMigration,
} from "@/lib/personal-field-guide";
import { readLocalQuestionSetsForMigration } from "@/lib/question-bank";
import { readLocalLiteratureForMigration } from "@/lib/user-literature";

const MIGRATED_FLAG = "wl-cloud-migrated-v1";

export function UserDataMigrator() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const sessionRes = await fetch("/api/auth/session", { credentials: "same-origin" });
      const session = (await sessionRes.json()) as { user: unknown };
      if (!session.user) return;
      if (typeof window !== "undefined" && window.localStorage.getItem(MIGRATED_FLAG) === "1") {
        return;
      }

      const fieldGuides = readLocalFieldGuideEntriesForMigration();
      const questionSets = readLocalQuestionSetsForMigration();
      const literatureMetas = readLocalLiteratureForMigration();
      if (!fieldGuides.length && !questionSets.length && !literatureMetas.length) {
        window.localStorage.setItem(MIGRATED_FLAG, "1");
        return;
      }

      const res = await fetch("/api/user/migrate-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ fieldGuides, questionSets, literatureMetas }),
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        imported?: { fieldGuides: number; questionSets: number; literature: number };
      };
      const total =
        (data.imported?.fieldGuides ?? 0) +
        (data.imported?.questionSets ?? 0) +
        (data.imported?.literature ?? 0);
      if (total > 0) {
        window.localStorage.removeItem("wl-personal-field-guide-v1");
        window.localStorage.removeItem("wl-question-bank-v1");
        window.localStorage.removeItem("wl-user-literature-v1");
      }
      window.localStorage.setItem(MIGRATED_FLAG, "1");
    })().catch(() => {
      /* 静默失败，下次登录再试 */
    });
  }, []);

  return null;
}
