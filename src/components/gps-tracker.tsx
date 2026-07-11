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
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      {tracking ? (
        <Button variant="outline" onClick={stop}>
          記録停止
        </Button>
      ) : (
        <Button onClick={start}>記録開始</Button>
      )}
      <span className="text-muted-foreground">
        {tracking
          ? `記録中... (${pointCount}件送信済み)`
          : "このタブを開いている間だけ位置情報が記録されます"}
      </span>
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
