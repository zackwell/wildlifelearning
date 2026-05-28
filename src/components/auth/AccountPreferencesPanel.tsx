"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COLOR_SCHEME_OPTIONS,
  DEFAULT_USER_PREFERENCES,
  loadUserPreferences,
  resetUserPreferences,
  saveUserPreferences,
  type ColorScheme,
  type UserPreferences,
} from "@/lib/user-preferences";
import {
  FIELD_GUIDE_SORT_OPTIONS,
  type FieldGuideSortMode,
} from "@/lib/field-guide-list-sort";

const cardClass =
  "rounded-2xl border border-stone-900/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-stone-900/50";
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-stone-300/80 bg-white/90 px-4 py-2.5 text-stone-900 outline-none ring-np-cta/30 focus:border-np-cta focus:ring-2 dark:border-stone-600 dark:bg-stone-950/50 dark:text-stone-50";
const labelClass = "text-sm font-medium text-stone-700 dark:text-stone-200";
const hintClass = "mt-1 text-xs text-stone-500 dark:text-stone-400";

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-stone-200/80 px-4 py-3 dark:border-stone-700">
      <span>
        <span className={labelClass}>{label}</span>
        <span className={hintClass}>{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 shrink-0 rounded border-stone-300"
      />
    </label>
  );
}

export function AccountPreferencesPanel() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadUserPreferences());
    setReady(true);
  }, []);

  const patch = useCallback((partial: Partial<UserPreferences>) => {
    const next = saveUserPreferences(partial);
    setPrefs(next);
    setNotice("偏好已保存。");
    window.setTimeout(() => setNotice(null), 2000);
  }, []);

  function onReset() {
    if (!window.confirm("确定恢复全部偏好为默认值吗？")) return;
    const next = resetUserPreferences();
    setPrefs(next);
    setNotice("已恢复默认偏好。");
  }

  if (!ready) {
    return (
      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">使用偏好</h2>
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">加载中…</p>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">使用偏好</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            保存在本浏览器，换设备或清除缓存后需重新设置。
          </p>
        </div>
        {notice ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-8">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            界面
          </h3>
          <label className="mt-3 block">
            <span className={labelClass}>外观主题</span>
            <select
              value={prefs.colorScheme}
              onChange={(e) => patch({ colorScheme: e.target.value as ColorScheme })}
              className={fieldClass}
            >
              {COLOR_SCHEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className={hintClass}>
              {COLOR_SCHEME_OPTIONS.find((o) => o.value === prefs.colorScheme)?.desc}
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            我的图鉴
          </h3>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className={labelClass}>列表默认排序</span>
              <select
                value={prefs.fieldGuideSortMode}
                onChange={(e) => patch({ fieldGuideSortMode: e.target.value as FieldGuideSortMode })}
                className={fieldClass}
              >
                {FIELD_GUIDE_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <ToggleRow
              label="默认只显示星标"
              hint="打开「我的图鉴」时自动勾选「仅星标」筛选"
              checked={prefs.fieldGuideStarredOnlyDefault}
              onChange={(checked) => patch({ fieldGuideStarredOnlyDefault: checked })}
            />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            知识专题
          </h3>
          <div className="mt-3 space-y-3">
            <ToggleRow
              label="新文献默认参与智能助手检索"
              hint="上传后自动勾选「在智能助手中引用此文」"
              checked={prefs.literatureDefaultEnabledForAsk}
              onChange={(checked) => patch({ literatureDefaultEnabledForAsk: checked })}
            />
            <ToggleRow
              label="进入知识专题时不自动弹出引导"
              hint="仍可通过页内「使用引导」按钮查看"
              checked={prefs.skipTopicsGuideAuto}
              onChange={(checked) => patch({ skipTopicsGuideAuto: checked })}
            />
            <ToggleRow
              label="生成检索版 / 智能排版时不二次确认"
              hint="跳过处理前的说明弹窗，直接开始后台任务"
              checked={prefs.skipLiteratureRagConfirm}
              onChange={(checked) => patch({ skipLiteratureRagConfirm: checked })}
            />
            <ToggleRow
              label="移除文献时不二次确认"
              hint="点击「移除」后立即删除，请谨慎开启"
              checked={prefs.skipLiteratureRemoveConfirm}
              onChange={(checked) => patch({ skipLiteratureRemoveConfirm: checked })}
            />
          </div>
        </div>

        <div className="border-t border-stone-200/80 pt-6 dark:border-stone-700">
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-stone-800/15 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-100/20 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            恢复全部默认偏好
          </button>
        </div>
      </div>
    </section>
  );
}
