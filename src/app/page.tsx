import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncPlaceVisits } from "@/lib/placeVisits";
import { getPhotosForDate } from "@/lib/photos";
import { syncTodayEvents, getCalendarEventsForDate } from "@/lib/googleCalendar";
import {
  MapView,
  type MapGap,
  type MapStay,
  type MapTrackPoint,
} from "@/components/map-view";
import { PhotoPickerButton } from "@/components/photo-picker-button";
import { PhotoThumbnail } from "@/components/photo-thumbnail";
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
  let gaps: MapGap[] = [];
  let hasRealData = false;
  let calendarEvents: DateNavEvent[] = [];
  let calendarSyncFailed = false;

  if (session?.user?.id) {
    try {
      const simpleEvents = isToday
        ? await syncTodayEvents(session.user.id)
        : await getCalendarEventsForDate(session.user.id, targetDate);
      calendarEvents = simpleEvents.map((event) => ({
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
      }));
    } catch (error) {
      console.error("Failed to sync calendar events", error);
      calendarSyncFailed = true;
    }

    const result = await syncPlaceVisits(session.user.id, targetDate);
    if (result.trackPoints.length > 0 || result.stays.length > 0) {
      hasRealData = true;
      stays = result.stays.map((stay) => ({
        id: stay.id,
        placeVisitId: stay.placeVisitId,
        name: stay.name,
        lat: stay.lat,
        lng: stay.lng,
        arrivedAt: stay.arrivedAt.toISOString(),
        departedAt: stay.departedAt ? stay.departedAt.toISOString() : null,
        calendarEventTitle: stay.calendarEventTitle,
      }));
      trackPoints = result.trackPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
    }
    gaps = result.gaps;
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
        gaps={gaps}
        center={center}
        editableNotes={hasRealData}
        dateParam={dateParam}
        canAddPin={Boolean(session?.user?.id)}
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

      {/* カレンダー同期エラー */}
      {session?.user?.id && calendarSyncFailed && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4">
          <p className="pointer-events-auto max-w-sm rounded-full bg-white/60 px-4 py-2 text-center text-xs text-destructive shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
            Googleカレンダーとの連携が切れています。一度ログアウトして再度ログインしてください。
          </p>
        </div>
      )}

      {/* 状態メッセージ */}
      {session?.user?.id && (usingDummy || !hasRealData) && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center px-4">
          <p className="pointer-events-auto max-w-sm rounded-full bg-white/60 px-4 py-2 text-center text-xs text-muted-foreground shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
            {usingDummy
              ? "これはサンプルのルートです。記録を開始すると実際のルートに切り替わります。"
              : "この日の記録はありません。"}
          </p>
        </div>
      )}

      {/* 下部: 日記 + 写真 */}
      {session?.user?.id && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
          <div className="pointer-events-auto flex max-h-[44vh] w-full max-w-2xl flex-col gap-2.5 overflow-y-auto">
            <DayDiaryEditor key={dateParam} dateParam={dateParam} />

            <div className="rounded-xl bg-white/60 p-2.5 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
              <div className={photos.length > 0 ? "mb-2 flex items-center justify-between" : "flex items-center justify-between"}>
                <h2 className="text-sm font-medium text-foreground/80">
                  写真{photos.length > 0 && ` (${photos.length})`}
                </h2>
                <PhotoPickerButton dateParam={dateParam} />
              </div>
              {photos.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {photos.map((photo) =>
                    photo.url ? (
                      <PhotoThumbnail key={photo.id} id={photo.id} url={photo.url} />
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
