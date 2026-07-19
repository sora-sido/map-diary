"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Camera, Clock, MapPin, MessageCircle, X } from "lucide-react";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  Polyline,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { LocationNoteEditor } from "@/components/location-note-editor";
import { StayTimeEditor } from "@/components/stay-time-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface MapStay {
  id: string;
  /** PlaceVisit.id。未設定(ダミーデータ)の場合は時刻編集不可。 */
  placeVisitId?: string;
  name: string;
  lat: number;
  lng: number;
  arrivedAt: string;
  departedAt: string | null;
  note?: string;
  meetingSummary?: string;
  photoCount?: number;
  /** 滞在時間帯と重なるGoogleカレンダー予定のタイトル。 */
  calendarEventTitle?: string;
}

export interface MapTrackPoint {
  lat: number;
  lng: number;
}

/** GPSが途切れて記録できなかった、2つの滞在の間の区間。 */
export interface MapGap {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

const PIN_COLOR = "#dc2626";

/** 半角数字を全角数字(１２３...)に変換する。 */
function toFullWidthDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + 0xfee0),
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * GPSが途切れた区間を、実際の経路検索(Directions API)は使わずに
 * 2地点を直線で結ぶ破線として示す。
 */
function GapLines({ gaps }: { gaps: MapGap[] }) {
  return (
    <>
      {gaps.map((gap, i) => (
        <Polyline
          key={i}
          path={[gap.from, gap.to]}
          strokeOpacity={0}
          icons={[
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
              offset: "0",
              repeat: "12px",
            },
          ]}
        />
      ))}
    </>
  );
}

export function MapView({
  apiKey,
  stays,
  trackPoints,
  gaps = [],
  center,
  editableNotes = false,
  dateParam,
  canAddPin = false,
}: {
  apiKey?: string;
  stays: MapStay[];
  trackPoints: MapTrackPoint[];
  /** GPSが途切れて繋がっていない滞在間の区間(経路検索で補完表示する)。 */
  gaps?: MapGap[];
  center: { lat: number; lng: number };
  /** trueの場合、ピンのInfoWindowで場所メモを編集できる(実データのLocationにのみ有効)。 */
  editableNotes?: boolean;
  /** 手動ピンをどの日に紐付けるか(YYYY-MM-DD)。canAddPinがtrueなら必須。 */
  dateParam?: string;
  /** trueの場合、地図をクリックして手動でピンを置けるようにする。 */
  canAddPin?: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const selectedStay = stays.find((stay) => stay.id === selectedId);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEYが設定されていません。
      </div>
    );
  }

  function handleMapClick(event: MapMouseEvent) {
    if (!addMode || !event.detail.latLng) return;
    setSelectedId(null);
    setPendingPin({ lat: event.detail.latLng.lat, lng: event.detail.latLng.lng });
    setPendingName("");
    setAddMode(false);
  }

  async function savePin() {
    if (!pendingPin || !dateParam) return;
    setSavingPin(true);
    try {
      await fetch("/api/place-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pendingPin.lat,
          lng: pendingPin.lng,
          name: pendingName,
          date: dateParam,
        }),
      });
      setPendingPin(null);
      router.refresh();
    } finally {
      setSavingPin(false);
    }
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="h-full w-full"
        mapId="DEMO_MAP_ID"
        defaultCenter={center}
        defaultZoom={9}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        colorScheme="LIGHT"
        onClick={handleMapClick}
      >
        {trackPoints.length > 0 && (
          <Polyline
            path={trackPoints}
            strokeColor="#3b82f6"
            strokeOpacity={0.9}
            strokeWeight={4}
          />
        )}

        <GapLines gaps={gaps} />

        {stays.map((stay, index) => (
          <AdvancedMarker
            key={stay.id}
            position={{ lat: stay.lat, lng: stay.lng }}
            title={stay.calendarEventTitle ?? stay.name}
            onClick={() => setSelectedId(stay.id)}
          >
            <Pin
              background={PIN_COLOR}
              borderColor={PIN_COLOR}
              glyphColor="#ffffff"
              glyphText={toFullWidthDigits(index + 1)}
              scale={1}
            />
          </AdvancedMarker>
        ))}

        {pendingPin && (
          <>
            <AdvancedMarker position={pendingPin}>
              <Pin background="#2563eb" borderColor="#2563eb" glyphColor="#2563eb" />
            </AdvancedMarker>
            <InfoWindow
              position={pendingPin}
              onCloseClick={() => setPendingPin(null)}
            >
              <div className="w-56 p-3">
                <p className="mb-2 text-sm font-semibold tracking-tight">
                  この場所にピンを追加
                </p>
                <Input
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  placeholder="場所の名前(任意)"
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={savePin}
                    disabled={savingPin}
                  >
                    {savingPin ? "追加中..." : "追加"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => setPendingPin(null)}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </InfoWindow>
          </>
        )}

        {selectedStay && (
          <InfoWindow
            position={{ lat: selectedStay.lat, lng: selectedStay.lng }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="w-72 overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                {selectedStay.calendarEventTitle ? (
                  <>
                    <p className="text-[15px] leading-tight font-semibold tracking-tight text-foreground">
                      {selectedStay.calendarEventTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedStay.name}
                    </p>
                  </>
                ) : (
                  <p className="text-[15px] leading-tight font-semibold tracking-tight text-foreground">
                    {selectedStay.name}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {selectedStay.calendarEventTitle ? (
                    <Calendar className="size-3 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Clock className="size-3 shrink-0" strokeWidth={2.5} />
                  )}
                  <span>
                    {formatTime(selectedStay.arrivedAt)}
                    {selectedStay.departedAt &&
                      ` – ${formatTime(selectedStay.departedAt)}`}
                  </span>
                  {editableNotes && selectedStay.placeVisitId && (
                    <StayTimeEditor
                      key={selectedStay.id}
                      placeVisitId={selectedStay.placeVisitId}
                      arrivedAt={selectedStay.arrivedAt}
                      departedAt={selectedStay.departedAt}
                    />
                  )}
                </div>
              </div>

              {(editableNotes ||
                selectedStay.note ||
                selectedStay.meetingSummary ||
                selectedStay.photoCount !== undefined) && (
                <div className="flex flex-col gap-3 border-t border-black/[0.06] bg-black/[0.015] px-4 py-3.5">
                  {editableNotes ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-foreground/70">
                        自分のメモ
                      </p>
                      <LocationNoteEditor
                        key={selectedStay.id}
                        locationId={selectedStay.id}
                      />
                    </div>
                  ) : (
                    selectedStay.note && (
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {selectedStay.note}
                      </p>
                    )
                  )}

                  {selectedStay.meetingSummary && (
                    <div className="flex items-start gap-2 rounded-xl bg-black/[0.03] px-2.5 py-2">
                      <MessageCircle
                        className="mt-0.5 size-3.5 shrink-0 text-foreground/50"
                        strokeWidth={2.25}
                      />
                      <p className="text-xs leading-relaxed text-foreground/70">
                        {selectedStay.meetingSummary}
                      </p>
                    </div>
                  )}

                  {selectedStay.photoCount !== undefined &&
                    selectedStay.photoCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Camera className="size-3.5" strokeWidth={2.25} />
                        <span>写真 {selectedStay.photoCount}枚</span>
                      </div>
                    )}
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>

      {canAddPin && (
        <div className="pointer-events-none absolute top-16 right-4 z-10">
          <Button
            size="icon-sm"
            variant={addMode ? "default" : "secondary"}
            className="pointer-events-auto rounded-full bg-white/60 shadow-lg ring-1 ring-white/60 backdrop-blur-xl hover:bg-white/80"
            onClick={() => setAddMode((v) => !v)}
            aria-label={addMode ? "ピン追加をキャンセル" : "ピンを手動で追加"}
          >
            {addMode ? <X className="size-4" /> : <MapPin className="size-4" />}
          </Button>
        </div>
      )}
      {addMode && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-10 flex justify-center px-4">
          <p className="rounded-full bg-white/60 px-4 py-2 text-center text-xs text-muted-foreground shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
            地図をタップしてピンを置く場所を選んでください
          </p>
        </div>
      )}
    </APIProvider>
  );
}
