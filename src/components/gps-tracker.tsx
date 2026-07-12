"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function GpsTracker() {
  const [tracking, setTracking] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const router = useRouter();

  function start() {
    if (!("geolocation" in navigator)) {
      setError("このブラウザは位置情報に対応していません。");
      return;
    }
    setError(null);
    setPointCount(0);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
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
            // 送信失敗は無視し、次のポイントを待つ
          });
      },
      () => setError("位置情報を取得できませんでした。ブラウザの権限設定を確認してください。"),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    watchIdRef.current = id;
    setTracking(true);
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2 rounded-full bg-white/90 py-1.5 pr-1.5 pl-4 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
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
        <span className="max-w-56 rounded-lg bg-white/90 px-3 py-1.5 text-right text-xs text-destructive shadow-lg backdrop-blur-md">
          {error}
        </span>
      )}
    </div>
  );
}
