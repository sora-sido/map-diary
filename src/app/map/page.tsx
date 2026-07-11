import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncPlaceVisits } from "@/lib/placeVisits";
import { MapView, type MapStay, type MapTrackPoint } from "@/components/map-view";
import { GpsTracker } from "@/components/gps-tracker";
import { dummyStays, dummyTrackPoints } from "@/lib/fixtures/dummy-route";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const session = await getServerSession(authOptions);

  let stays: MapStay[] = [];
  let trackPoints: MapTrackPoint[] = [];
  let usingDummy = true;

  if (session?.user?.id) {
    const result = await syncPlaceVisits(session.user.id);
    if (result.trackPoints.length > 0) {
      usingDummy = false;
      stays = result.stays.map((stay) => ({
        id: stay.id,
        name: stay.name,
        lat: stay.lat,
        lng: stay.lng,
        arrivedAt: stay.arrivedAt.toISOString(),
        departedAt: stay.departedAt.toISOString(),
      }));
      trackPoints = result.trackPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
    }
  }

  if (usingDummy) {
    stays = dummyStays.map((stay) => ({
      id: stay.id,
      name: stay.name,
      lat: stay.lat,
      lng: stay.lng,
      arrivedAt: stay.arrivedAt,
      departedAt: stay.departedAt,
      note: stay.note,
      meetingSummary: stay.meetingSummary,
      photoCount: stay.photoCount,
    }));
    trackPoints = dummyTrackPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
  }

  const center = stays[0]
    ? { lat: stays[0].lat, lng: stays[0].lng }
    : { lat: 35.68, lng: 139.75 };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {usingDummy ? "今日のルート(ダミーデータ)" : "今日のルート"}
        </h1>
        {usingDummy ? (
          <p className="text-sm text-muted-foreground">
            自宅 → 東京大学 → ランチ → 打ち合わせ → 常総アカデミー →
            帰宅(記録を開始すると、あなたの実際のルートに切り替わります)
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            今日記録された実際の位置情報から生成されたルートです。
          </p>
        )}
      </div>
      {session?.user?.id && <GpsTracker />}
      <MapView
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        stays={stays}
        trackPoints={trackPoints}
        center={center}
        editableNotes={!usingDummy}
      />
    </div>
  );
}
