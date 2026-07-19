"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, NotebookPen } from "lucide-react";
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
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 rounded-xl bg-white/60 px-3.5 py-2.5 text-left shadow-lg ring-1 ring-white/60 backdrop-blur-xl"
      >
        <NotebookPen className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
        <span className="flex-1 truncate text-sm text-foreground/80">
          {loading
            ? "読み込み中..."
            : note || "今日はどんな一日でしたか?"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/60 p-3.5 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
          <NotebookPen className="size-4" strokeWidth={2} />
          日記
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
        size="icon-sm"
        className="rounded-full"
        onClick={save}
        disabled={saving || loading}
        aria-label="保存"
      >
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Check className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
