import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncPlaceVisits } from "@/lib/placeVisits";
import { getPhotosForDate } from "@/lib/photos";
import { syncTodayEvents, getCalendarEventsForDate } from "@/lib/googleCalendar";
import {
  MapView,
  type MapStay,
  type MapTrackPoint,
} from "@/components/map-view";
import { GpsTracker } from "@/components/gps-tracker";
import { PhotoPickerButton } from "@/components/photo-picker-button";
import { DateNav, type DateNavEvent } from "@/components/date-nav";
import { DayDiaryEditor } from "@/components/day-diary-editor";
import { AccountMenu } from "@/components/account-menu";
import { LoginGate } from "@/components/login-gate";
import { dummyStays, dummyTrackPoints } from "@/lib/fixtures/dummy-route";
import { formatDateParam, isSameDay, parseDateParam, today } from "@/lib/dateParam";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { date } = await searchParams;
  const targetDate = parseDateParam(date);
  const isToday = isSameDay(targetDate, today());
  const dateParam = formatDateParam(targetDate);

  let stays: MapStay[] = [];
  let trackPoints: MapTrackPoint[] = [];
  let hasRealData = false;
  let calendarEvents: DateNavEvent[] = [];

  if (session?.user?.id) {
    const simpleEvents = isToday
      ? await syncTodayEvents(session.user.id)
      : await getCalendarEventsForDate(session.user.id, targetDate);
    calendarEvents = simpleEvents.map((event) => ({
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
    }));

    const result = await syncPlaceVisits(session.user.id, targetDate);
    if (result.trackPoints.length > 0) {
      hasRealData = true;
      stays = result.stays.map((stay) => ({
        id: stay.id,
        name: stay.name,
        lat: stay.lat,
        lng: stay.lng,
        arrivedAt: stay.arrivedAt.toISOString(),
        departedAt: stay.departedAt.toISOString(),
        calendarEventTitle: stay.calendarEventTitle,
      }));
      trackPoints = result.trackPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
    }
  }

  const usingDummy = !hasRealData && isToday;

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

  const photos = session?.user?.id
    ? await getPhotosForDate(session.user.id, targetDate)
    : [];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-muted">
      <MapView
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
        stays={stays}
        trackPoints={trackPoints}
        center={center}
        editableNotes={hasRealData}
      />

      {!session?.user?.id && <LoginGate />}

      {/* 左上: アカウントメニュー */}
      {session?.user?.id && (
        <div className="pointer-events-none absolute top-4 left-4 z-10">
          <div className="pointer-events-auto">
            <AccountMenu />
          </div>
        </div>
      )}

      {/* 上部中央: 日付ナビゲーション(クリックでカレンダー+その日の予定) */}
      {session?.user?.id && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
          <div className="pointer-events-auto">
            <DateNav date={targetDate} events={calendarEvents} />
          </div>
        </div>
      )}

      {/* 右上: GPS記録 */}
      {session?.user?.id && isToday && (
        <div className="pointer-events-none absolute top-4 right-4 z-10">
          <div className="pointer-events-auto">
            <GpsTracker />
          </div>
        </div>
      )}

      {/* 状態メッセージ */}
      {session?.user?.id && (usingDummy || !hasRealData) && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4">
          <p className="pointer-events-auto max-w-sm rounded-full bg-white/90 px-4 py-2 text-center text-xs text-muted-foreground shadow-lg ring-1 ring-black/5 backdrop-blur-md">
            {usingDummy
              ? "これはサンプルのルートです。記録を開始すると実際のルートに切り替わります。"
              : "この日の記録はありません。"}
          </p>
        </div>
      )}

      {/* 下部: 日記 + 写真 */}
      {session?.user?.id && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
          <div className="pointer-events-auto flex max-h-[48vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto">
            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
              <h2 className="mb-2 text-sm font-semibold tracking-tight">
                日記
              </h2>
              <DayDiaryEditor key={dateParam} dateParam={dateParam} />
            </div>

            <div className="rounded-2xl bg-white/90 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight">写真</h2>
                <PhotoPickerButton dateParam={dateParam} />
              </div>
              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {photos.map((photo) =>
                    photo.url ? (
                      <Image
                        key={photo.id}
                        src={photo.url}
                        alt=""
                        width={96}
                        height={96}
                        unoptimized
                        className="h-24 w-24 shrink-0 rounded-xl object-cover"
                      />
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
