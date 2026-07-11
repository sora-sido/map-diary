"use client";

import { useState } from "react";
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
      <div className="flex h-[70vh] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEYが設定されていません。
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        className="h-[70vh] w-full rounded-xl"
        defaultCenter={center}
        defaultZoom={9}
        gestureHandling="greedy"
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
            title={stay.name}
            onClick={() => setSelectedId(stay.id)}
          />
        ))}

        {selectedStay && (
          <InfoWindow
            position={{ lat: selectedStay.lat, lng: selectedStay.lng }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="max-w-64 p-1 text-sm">
              <p className="mb-1 font-semibold">{selectedStay.name}</p>
              <p className="mb-2 text-xs text-muted-foreground">
                {formatTime(selectedStay.arrivedAt)}
                {selectedStay.departedAt &&
                  ` - ${formatTime(selectedStay.departedAt)}`}
              </p>
              {editableNotes ? (
                <div className="mb-1">
                  <LocationNoteEditor
                    key={selectedStay.id}
                    locationId={selectedStay.id}
                  />
                </div>
              ) : (
                selectedStay.note && (
                  <p className="mb-1">{selectedStay.note}</p>
                )
              )}
              {selectedStay.meetingSummary && (
                <p className="mb-1 text-xs">
                  💬 {selectedStay.meetingSummary}
                </p>
              )}
              {selectedStay.photoCount !== undefined && (
                <p className="text-xs text-muted-foreground">
                  📷 写真 {selectedStay.photoCount}枚
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
