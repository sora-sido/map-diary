"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// 端末によっては、電波状況などでGPSの測位に失敗した後、エラーコールバックすら呼ばれずに
// watchPositionが無言で更新を止めてしまうことがある(ブラウザ側の既知の挙動)。
// そのため一定時間コールバックが来なければ監視を強制的に張り直す「ウォッチドッグ」を仕込む。
const STALE_THRESHOLD_MS = 45_000;
const WATCHDOG_INTERVAL_MS = 20_000;

export function GpsTracker() {
  const [tracking, setTracking] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const watchdogIdRef = useRef<number | null>(null);
  const lastUpdateAtRef = useRef<number>(0);
  const router = useRouter();

  // ページ離脱・アンマウント時は必ず位置情報の監視を止める
  // (放置するとタブを閉じるまでバックグラウンドで送信され続けてしまう)。
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (watchdogIdRef.current !== null) {
        window.clearInterval(watchdogIdRef.current);
        watchdogIdRef.current = null;
      }
    };
  }, []);

  function watchPosition() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        lastUpdateAtRef.current = Date.now();
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
      () => {
        lastUpdateAtRef.current = Date.now();
        setError("位置情報を取得できませんでした。ブラウザの権限設定を確認してください。");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    watchIdRef.current = id;
  }

  function start() {
    if (!("geolocation" in navigator)) {
      setError("このブラウザは位置情報に対応していません。");
      return;
    }
    setError(null);
    setPointCount(0);
    lastUpdateAtRef.current = Date.now();

    watchPosition();
    watchdogIdRef.current = window.setInterval(() => {
      if (Date.now() - lastUpdateAtRef.current > STALE_THRESHOLD_MS) {
        watchPosition();
      }
    }, WATCHDOG_INTERVAL_MS);
    setTracking(true);
  }

  function stop() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchdogIdRef.current !== null) {
      window.clearInterval(watchdogIdRef.current);
      watchdogIdRef.current = null;
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
