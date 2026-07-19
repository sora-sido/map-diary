"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// 常時watchPositionだとバッテリー消費が大きく、端末によっては測位失敗後に
// 無言で更新が止まることもあるため、一定間隔でgetCurrentPositionを呼ぶ
// ポーリング方式にしている(失敗しても次の間隔で自然にリトライされる)。
const LOCATION_INTERVAL_MS = 5 * 60 * 1000;

export function GpsTracker() {
  const [tracking, setTracking] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const router = useRouter();

  // ページ離脱・アンマウント時は必ずポーリングを止める
  // (放置するとタブを閉じるまでバックグラウンドで送信され続けてしまう)。
  useEffect(() => {
    return () => {
      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, []);

  function recordCurrentPosition() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setError(null);
        const { latitude, longitude, accuracy, speed } = pos.coords;
        fetch("/api/gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            accuracy,
            speed: speed ?? undefined,
            recordedAt: new Date(pos.timestamp).toISOString(),
          }),
        })
          .then(() => setPointCount((count) => count + 1))
          .catch(() => {
            // 送信失敗は無視し、次の間隔を待つ
          });
      },
      () => setError("位置情報を取得できませんでした。ブラウザの権限設定を確認してください。"),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 },
    );
  }

  function start() {
    if (!("geolocation" in navigator)) {
      setError("このブラウザは位置情報に対応していません。");
      return;
    }
    setError(null);
    setPointCount(0);

    recordCurrentPosition();
    intervalIdRef.current = window.setInterval(
      recordCurrentPosition,
      LOCATION_INTERVAL_MS,
    );
    setTracking(true);
  }

  function stop() {
    if (intervalIdRef.current !== null) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setTracking(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2 rounded-full bg-white/60 py-1.5 pr-1.5 pl-4 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
        <span className="text-sm font-medium text-foreground">
          {tracking ? `記録中 ${pointCount}` : "記録"}
        </span>
        {tracking ? (
          <Button
            size="icon-sm"
            variant="destructive"
            className="rounded-full"
            onClick={stop}
            aria-label="記録停止"
          >
            <span className="size-2.5 rounded-[2px] bg-current" />
          </Button>
        ) : (
          <Button
            size="icon-sm"
            className="rounded-full bg-red-500 hover:bg-red-500/90"
            onClick={start}
            aria-label="記録開始"
          >
            <span className="size-2.5 rounded-full bg-white" />
          </Button>
        )}
      </div>
      {error && (
        <span className="max-w-56 rounded-lg bg-white/60 px-3 py-1.5 text-right text-xs text-destructive shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
          {error}
        </span>
      )}
    </div>
  );
}
