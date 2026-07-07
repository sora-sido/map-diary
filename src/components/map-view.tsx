"use client";

import { useState } from "react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  Polyline,
} from "@vis.gl/react-google-maps";
import { dummyStays, dummyTrackPoints } from "@/lib/fixtures/dummy-route";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MapView({ apiKey }: { apiKey?: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedStay = dummyStays.find((stay) => stay.id === selectedId);

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
        defaultCenter={{ lat: 35.82, lng: 139.85 }}
        defaultZoom={9}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        <Polyline
          path={dummyTrackPoints.map((p) => ({ lat: p.lat, lng: p.lng }))}
          strokeColor="#111827"
          strokeOpacity={0.8}
          strokeWeight={3}
        />

        {dummyStays.map((stay) => (
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
                {formatTime(selectedStay.arrivedAt)} -{" "}
                {formatTime(selectedStay.departedAt)}
              </p>
              <p className="mb-1">{selectedStay.note}</p>
              {selectedStay.meetingSummary && (
                <p className="mb-1 text-xs">
                  💬 {selectedStay.meetingSummary}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                📷 写真 {selectedStay.photoCount}枚
              </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
