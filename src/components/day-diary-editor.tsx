"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function DayDiaryEditor({ dateParam }: { dateParam: string }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
    try {
      await fetch(`/api/days/${dateParam}/diary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="今日はどんな一日でしたか?"
        className="min-h-24 rounded-lg border-black/10 bg-white text-sm shadow-none"
        disabled={loading}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 w-fit rounded-full px-3 text-xs"
          onClick={save}
          disabled={saving || loading}
        >
          {saving ? "保存中..." : "保存"}
        </Button>
        {saved && (
          <span className="text-xs text-muted-foreground">保存しました</span>
        )}
      </div>
    </div>
  );
}
