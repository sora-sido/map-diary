"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// 常時watchPositionだとバッテリー消費が大きく、端末によっては測位失敗後に
// 無言で更新が止まることもあるため、一定間隔でgetCurrentPositionを呼ぶ
// ポーリング方式にしている(失敗しても次の間隔で自然にリトライされる)。
const LOCATION_INTERVAL_MS = 5 * 60 * 1000;

// enableHighAccuracy:trueでも、屋内などでGPS衛星を掴めない場合はブラウザ/OSが
// Wi-Fi・基地局・IPアドレスからの推定位置(誤差が数百m〜数十kmになりうる)を
// 無言で返してくることがある。ここを超える精度の点は実際の現在地とみなさず捨てる。
const MAX_ACCEPTABLE_ACCURACY_METERS = 500;

// 記録ボタンの周りに表示する、次の取得までの進捗を示す弧のサイズ。
const RING_SIZE = 34;
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function GpsTracker() {
  const [tracking, setTracking] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // 5分間隔のうち、今どのタイミングかを示す弧をリセットするためのキー。
  // 取得を試みるたびに値を変え、その円要素を再マウントしてCSSアニメーションを最初から再生する。
  const [cycleKey, setCycleKey] = useState(0);
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
    setCycleKey((key) => key + 1);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;

        if (accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
          setError(
            `精度が低い(誤差約${Math.round(accuracy)}m)ため、この位置はスキップしました。`,
          );
          return;
        }

        setError(null);
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
          <div
            className="relative flex items-center justify-center"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="rgb(239 68 68 / 0.15)"
                strokeWidth={2}
              />
              <circle
                key={cycleKey}
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="rgb(239 68 68 / 0.55)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                className="gps-progress-ring"
              />
            </svg>
            <Button
              size="icon-sm"
              variant="destructive"
              className="rounded-full"
              onClick={stop}
              aria-label="記録停止"
            >
              <span className="size-2.5 rounded-[2px] bg-current" />
            </Button>
          </div>
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
