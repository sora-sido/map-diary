"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PhotoPickerButton() {
  const [status, setStatus] = useState<"idle" | "waiting">("idle");
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);
  const router = useRouter();

  async function start() {
    setError(null);
    setStatus("waiting");
    stoppedRef.current = false;

    try {
      const res = await fetch("/api/photos/session", { method: "POST" });
      if (!res.ok) throw new Error("セッションの作成に失敗しました");
      const { id, pickerUri } = (await res.json()) as {
        id: string;
        pickerUri: string;
      };

      window.open(pickerUri, "_blank", "noopener,noreferrer");
      poll(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStatus("idle");
    }
  }

  // 前回のポーリングが完了してから次を予約する(setIntervalだと応答待ち中に
  // 次のリクエストが重なり、写真の重複インポートを引き起こすため)。
  async function poll(sessionId: string) {
    if (stoppedRef.current) return;

    try {
      const res = await fetch(`/api/photos/session/${sessionId}`);
      const data = (await res.json()) as { done?: boolean; error?: string };

      if (data.error) {
        setError(data.error);
        setStatus("idle");
        return;
      }
      if (data.done) {
        setStatus("idle");
        router.refresh();
        return;
      }
    } catch {
      // 一時的な失敗は無視して次のポーリングを試みる
    }

    if (!stoppedRef.current) {
      setTimeout(() => poll(sessionId), 3000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={start} disabled={status !== "idle"}>
        {status === "idle" ? "写真を選ぶ" : "選択を待っています..."}
      </Button>
      {status === "waiting" && (
        <span className="text-sm text-muted-foreground">
          Google Photosのタブで写真を選んでください
        </span>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
