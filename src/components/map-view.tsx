"use client";

import { useState } from "react";
import { Calendar, Camera, Clock, MessageCircle } from "lucide-react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  Polyline,
} from "@vis.gl/react-google-maps";
import { LocationNoteEditor } from "@/components/location-note-editor";

export interface MapStay {
  id: string;
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MapView({
  apiKey,
  stays,
  trackPoints,
  center,
  editableNotes = false,
}: {
  apiKey?: string;
  stays: MapStay[];
  trackPoints: MapTrackPoint[];
  center: { lat: number; lng: number };
  /** trueの場合、ピンのInfoWindowで場所メモを編集できる(実データのLocationにのみ有効)。 */
  editableNotes?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedStay = stays.find((stay) => stay.id === selectedId);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEYが設定されていません。
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="h-full w-full"
        defaultCenter={center}
        defaultZoom={9}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        colorScheme="LIGHT"
      >
        {trackPoints.length > 0 && (
          <Polyline
            path={trackPoints}
            strokeColor="#111827"
            strokeOpacity={0.8}
            strokeWeight={3}
          />
        )}

        {stays.map((stay) => (
          <Marker
            key={stay.id}
            position={{ lat: stay.lat, lng: stay.lng }}
            title={stay.calendarEventTitle ?? stay.name}
            onClick={() => setSelectedId(stay.id)}
          />
        ))}

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
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  {selectedStay.calendarEventTitle ? (
                    <Calendar className="size-3" strokeWidth={2.5} />
                  ) : (
                    <Clock className="size-3" strokeWidth={2.5} />
                  )}
                  {formatTime(selectedStay.arrivedAt)}
                  {selectedStay.departedAt &&
                    ` – ${formatTime(selectedStay.departedAt)}`}
                </p>
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
                    <div className="flex items-start gap-2 rounded-xl bg-blue-500/8 px-2.5 py-2">
                      <MessageCircle
                        className="mt-0.5 size-3.5 shrink-0 text-blue-600"
                        strokeWidth={2.25}
                      />
                      <p className="text-xs leading-relaxed text-blue-900">
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
    </APIProvider>
  );
}
