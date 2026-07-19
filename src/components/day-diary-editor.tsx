"use client";

import { useEffect, useState } from "react";
import { ChevronUp, Pencil, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DayDiaryEditor({ dateParam }: { dateParam: string }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/days/${dateParam}/diary`)
      .then((res) => res.json())
      .then((data: { note: string }) => {
        if (!cancelled) setNote(data.note ?? "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateParam]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/days/${dateParam}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      // 保存後は編集中に見えるテキストエリアを開いたままにせず、閲覧用の折りたたみ表示に戻す。
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  if (!expanded) {
    return (
      <div className="relative rounded-3xl bg-white/80 p-4 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <Sunrise className="size-[18px] text-orange-500" strokeWidth={2} />
          </span>
          <p className="text-sm font-semibold text-foreground">今日の記録</p>
        </div>
        <p className="line-clamp-2 pr-8 text-sm text-foreground/70">
          {loading ? "読み込み中..." : note || "今日はどんな一日でしたか?"}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="日記を編集"
          className="absolute -bottom-2 -right-2 flex size-11 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-colors hover:bg-blue-600"
        >
          <Pencil className="size-[18px]" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-white/80 p-4 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100">
            <Sunrise className="size-3.5 text-orange-500" strokeWidth={2} />
          </span>
          今日の記録
        </p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="閉じる"
          className="rounded-full p-1 text-muted-foreground hover:bg-black/[0.04]"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="今日はどんな一日でしたか?"
        className="min-h-24 rounded-lg border-black/10 bg-white text-sm shadow-none"
        disabled={loading}
        autoFocus
      />
      <Button
        size="sm"
        className="h-7 w-fit rounded-full bg-blue-500 px-3 text-xs hover:bg-blue-600"
        onClick={save}
        disabled={saving || loading}
      >
        {saving ? "保存中..." : "保存"}
      </Button>
    </div>
  );
}
