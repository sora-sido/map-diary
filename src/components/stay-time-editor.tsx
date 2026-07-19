"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** その日の日付を保ったまま、time inputの"HH:mm"だけを差し替えたISO文字列を作る。 */
function withTime(baseIso: string, time: string): string {
  const base = new Date(baseIso);
  const [h, m] = time.split(":").map(Number);
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

export function StayTimeEditor({
  placeVisitId,
  arrivedAt,
  departedAt,
}: {
  placeVisitId: string;
  arrivedAt: string;
  departedAt: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [arrivedTime, setArrivedTime] = useState(toTimeInputValue(arrivedAt));
  const [departedTime, setDepartedTime] = useState(
    departedAt ? toTimeInputValue(departedAt) : "",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/place-visits/${placeVisitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrivedAt: withTime(arrivedAt, arrivedTime),
          departedAt: departedTime ? withTime(arrivedAt, departedTime) : null,
        }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="時刻を編集"
        className="rounded-full p-0.5 text-muted-foreground hover:bg-black/[0.04]"
      >
        <Pencil className="size-3" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        type="time"
        value={arrivedTime}
        onChange={(e) => setArrivedTime(e.target.value)}
        className="h-6 w-[5.5rem] px-1.5 text-xs"
      />
      <span className="text-xs text-muted-foreground">–</span>
      <Input
        type="time"
        value={departedTime}
        onChange={(e) => setDepartedTime(e.target.value)}
        className="h-6 w-[5.5rem] px-1.5 text-xs"
      />
      <Button
        size="icon-xs"
        className="rounded-full"
        onClick={save}
        disabled={saving}
        aria-label="保存"
      >
        {saving ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Check className="size-3" />
        )}
      </Button>
    </div>
  );
}
