"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MINUTES = 10;
const MAX_POLLS = Math.ceil((MAX_POLL_MINUTES * 60 * 1000) / POLL_INTERVAL_MS);

export function PhotoPickerButton({ dateParam }: { dateParam: string }) {
  const [status, setStatus] = useState<"idle" | "waiting">("idle");
  const [error, setError] = useState<string | null>(null);
  const stoppedRef = useRef(false);
  const pollCountRef = useRef(0);
  const router = useRouter();

  // アンマウント(ページ離脱等)時にポーリングを必ず止める。
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
    };
  }, []);

  async function start() {
    setError(null);
    setStatus("waiting");
    stoppedRef.current = false;
    pollCountRef.current = 0;

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

    pollCountRef.current += 1;
    if (pollCountRef.current > MAX_POLLS) {
      setError("写真の選択がタイムアウトしました。もう一度お試しください。");
      setStatus("idle");
      return;
    }

    try {
      const res = await fetch(
        `/api/photos/session/${sessionId}?date=${dateParam}`,
      );
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
      setTimeout(() => poll(sessionId), POLL_INTERVAL_MS);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="icon-sm"
        variant="secondary"
        className="rounded-full"
        onClick={start}
        disabled={status !== "idle"}
        aria-label="写真を追加"
      >
        {status === "idle" ? (
          <Plus className="size-4" />
        ) : (
          <Loader2 className="size-4 animate-spin" />
        )}
      </Button>
      {status === "waiting" && (
        <span className="text-xs text-muted-foreground">
          Google Photosのタブで写真を選んでください
        </span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
