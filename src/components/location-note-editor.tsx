"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function LocationNoteEditor({ locationId }: { locationId: string }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/locations/${locationId}/note`)
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
  }, [locationId]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/locations/${locationId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="例: ○○さんと△△について打ち合わせ"
        className="min-h-20 rounded-lg border-black/10 bg-white text-sm shadow-none"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button
          size="icon-sm"
          className="rounded-full"
          onClick={save}
          disabled={saving}
          aria-label="保存"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
        </Button>
        {saved && (
          <span className="text-xs text-muted-foreground">保存しました</span>
        )}
      </div>
    </div>
  );
}
