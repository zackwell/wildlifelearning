"use client";

import { useCallback, useEffect, useState } from "react";
import {
  literatureRagLabels,
  shouldSkipLiteratureRagConfirm,
} from "@/lib/literature/rag-labels";
import { LiteratureTranslateConfirmModal } from "@/components/topics/LiteratureTranslateConfirmModal";

const ACTION_BTN =
  "inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 whitespace-nowrap";

const ACTION_BTN_LARGE =
  "inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-600 whitespace-nowrap";

type Props = {
  literatureId: string;
  zhRagReady?: boolean;
  translationFailed?: boolean;
  translationProcessing?: boolean;
  predominantlyChinese?: boolean;
  compact?: boolean;
  onDone?: () => void;
  onError?: (message: string | null) => void;
};

export function LiteratureTranslateButton({
  literatureId,
  zhRagReady = false,
  translationProcessing = false,
  predominantlyChinese = false,
  compact = false,
  onDone,
  onError,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(translationProcessing);
  const labels = literatureRagLabels({ predominantlyChinese, zhRagReady });

  useEffect(() => {
    setProcessing(translationProcessing);
  }, [translationProcessing]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/literature/${literatureId}/translate`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        status?: string;
        error?: string;
      };
      if (data.status === "processing") return;
      if (data.status === "ready") {
        setProcessing(false);
        onError?.(null);
        onDone?.();
        return;
      }
      if (data.status === "failed") {
        setProcessing(false);
        onError?.(data.error ?? "处理失败");
        onDone?.();
      }
    } catch {
      /* 下次轮询 */
    }
  }, [literatureId, onDone, onError]);

  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => {
      void pollStatus();
    }, 3000);
    void pollStatus();
    return () => window.clearInterval(timer);
  }, [processing, pollStatus]);

  async function startJob() {
    setProcessing(true);
    try {
      const res = await fetch(`/api/literature/${literatureId}/translate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json()) as { error?: string; processing?: boolean };
      if (!res.ok) {
        throw new Error(json.error ?? "启动失败");
      }
      onDone?.();
    } catch (e) {
      setProcessing(false);
      onError?.(e instanceof Error ? e.message : "启动失败");
    }
  }

  function onClick() {
    if (processing) return;
    if (shouldSkipLiteratureRagConfirm()) {
      void startJob();
      return;
    }
    setModalOpen(true);
  }

  const btnClass = compact ? ACTION_BTN : ACTION_BTN_LARGE;

  return (
    <>
      <button
        type="button"
        disabled={processing}
        onClick={onClick}
        className={btnClass}
        title={processing ? "后台处理中，可继续浏览" : undefined}
      >
        {processing ? labels.processing : labels.action}
      </button>

      <LiteratureTranslateConfirmModal
        open={modalOpen}
        predominantlyChinese={predominantlyChinese}
        zhRagReady={zhRagReady}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => {
          setModalOpen(false);
          void startJob();
        }}
      />
    </>
  );
}

export function LiteratureTranslateStatus({
  zhRagReady,
  translationFailed,
  translationProcessing,
  predominantlyChinese = false,
  error,
}: {
  zhRagReady?: boolean;
  translationFailed?: boolean;
  translationProcessing?: boolean;
  predominantlyChinese?: boolean;
  error?: string | null;
}) {
  const labels = literatureRagLabels({ predominantlyChinese, zhRagReady: !!zhRagReady });

  if (translationProcessing) {
    return (
      <p className="text-xs text-emerald-700 dark:text-emerald-300">
        后台{predominantlyChinese ? "排版" : "翻译"}中，可继续其他操作…
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-xs text-red-600 dark:text-red-300" role="alert">
        {error}
      </p>
    );
  }
  if (zhRagReady) {
    return <p className="text-xs text-emerald-600 dark:text-emerald-400">{labels.readyHint}</p>;
  }
  if (translationFailed) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-200">上次处理失败，可重试</p>
    );
  }
  return null;
}
