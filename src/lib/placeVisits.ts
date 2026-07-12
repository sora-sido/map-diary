import { prisma } from "@/lib/prisma";
import { haversineMeters } from "@/lib/geo";
import { addDays, startOfDay } from "@/lib/dateParam";

export interface DerivedStay {
  id: string;
  name: string;
  lat: number;
  lng: number;
  arrivedAt: Date;
  departedAt: Date | null;
  durationMinutes: number | null;
  /** 滞在時間帯と重なるGoogleカレンダー予定のタイトル(あれば)。 */
  calendarEventTitle?: string;
  isManual?: boolean;
}

export interface DerivedTrackPoint {
  lat: number;
  lng: number;
  recordedAt: Date;
}

/** GPSが途切れて記録できなかった、2つの滞在の間の区間。 */
export interface DerivedGap {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

const STAY_RADIUS_METERS = 120;
const MIN_STAY_MINUTES = 5;

export async function findOrCreateLocation(
  userId: string,
  lat: number,
  lng: number,
  name?: string,
) {
  const existing = await prisma.location.findMany({ where: { userId } });
  const nearby = existing.find(
    (loc) => haversineMeters(loc.lat, loc.lng, lat, lng) <= STAY_RADIUS_METERS,
  );
  if (nearby) return nearby;

  const created = await prisma.location.create({
    data: {
      userId,
      name: name?.trim() || `未設定の場所 (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      lat,
      lng,
    },
  });
  await prisma.$executeRaw`
    UPDATE locations
    SET geog = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${created.id}
  `;
  return created;
}

function matchCalendarEvent(
  events: { title: string; startTime: Date; endTime: Date }[],
  arrivedAt: Date,
  departedAt: Date | null,
) {
  if (departedAt) {
    return events.find(
      (event) => event.startTime < departedAt && event.endTime > arrivedAt,
    );
  }
  // 手動ピンなど退出時刻が無い場合は、到着時刻がその予定の枠内に入っているかで判定する。
  return events.find(
    (event) => event.startTime <= arrivedAt && event.endTime >= arrivedAt,
  );
}

async function getManualStays(
  userId: string,
  dailyLogId: string,
  dayEvents: { title: string; startTime: Date; endTime: Date }[],
): Promise<DerivedStay[]> {
  const manualVisits = await prisma.placeVisit.findMany({
    where: { userId, dailyLogId, isManual: true },
    include: { location: true },
    orderBy: { arrivedAt: "asc" },
  });

  return manualVisits.map((visit) => ({
    id: visit.location.id,
    name: visit.location.name,
    lat: visit.location.lat,
    lng: visit.location.lng,
    arrivedAt: visit.arrivedAt,
    departedAt: visit.departedAt,
    durationMinutes: visit.durationMinutes,
    calendarEventTitle: matchCalendarEvent(
      dayEvents,
      visit.arrivedAt,
      visit.departedAt,
    )?.title,
    isManual: true,
  }));
}

/**
 * 時系列順に並んだ滞在のうち、GPS打点で繋がっていない区間を「ギャップ」として検出する。
 * 経路検索(Directions)で補完する候補として使う。
 */
function computeGaps(
  stays: DerivedStay[],
  points: { recordedAt: Date }[],
): DerivedGap[] {
  const gaps: DerivedGap[] = [];

  for (let i = 0; i < stays.length - 1; i++) {
    const a = stays[i];
    const b = stays[i + 1];
    const from = a.departedAt ?? a.arrivedAt;
    const to = b.arrivedAt;

    const hasConnectingPoints = points.some(
      (p) => p.recordedAt > from && p.recordedAt < to,
    );
    if (!hasConnectingPoints) {
      gaps.push({
        from: { lat: a.lat, lng: a.lng },
        to: { lat: b.lat, lng: b.lng },
      });
    }
  }

  return gaps;
}

/**
 * 指定日のgps_logsから滞在(place_visits)をシンプルな逐次クラスタリングで再計算する。
 * syncTodayEvents(Calendar)と同じく、ページ表示のたびに再計算する冪等な設計。
 * 半径STAY_RADIUS_METERS以内に留まった時間がMIN_STAY_MINUTES以上の区間を1滞在とみなす。
 * GPSが取れず手動で置かれたピン(isManual)はこの再計算で消さずに残す。
 */
export async function syncPlaceVisits(
  userId: string,
  targetDate: Date,
): Promise<{
  stays: DerivedStay[];
  trackPoints: DerivedTrackPoint[];
  gaps: DerivedGap[];
}> {
  const dateOnly = startOfDay(targetDate);
  const nextDay = addDays(dateOnly, 1);

  const points = await prisma.gpsLog.findMany({
    where: { userId, recordedAt: { gte: dateOnly, lt: nextDay } },
    orderBy: { recordedAt: "asc" },
  });

  // 滞在時間帯と重なるカレンダー予定を後で突き合わせるため、その日の予定を先に取得しておく。
  const dayEvents = await prisma.calendarEvent.findMany({
    where: { userId, startTime: { lt: nextDay }, endTime: { gt: dateOnly } },
  });

  const existingDailyLog = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId, date: dateOnly } },
  });
  const manualStays = existingDailyLog
    ? await getManualStays(userId, existingDailyLog.id, dayEvents)
    : [];

  if (points.length < 2) {
    const sortedStays = [...manualStays].sort(
      (a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime(),
    );
    return {
      stays: sortedStays,
      trackPoints: points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        recordedAt: p.recordedAt,
      })),
      gaps: computeGaps(sortedStays, points),
    };
  }

  const dailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: { userId, date: dateOnly },
    update: {},
  });

  await prisma.placeVisit.deleteMany({
    where: { userId, dailyLogId: dailyLog.id, isManual: false },
  });

  const clusters: (typeof points)[] = [];
  let current: typeof points = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const centroidLat =
      current.reduce((sum, p) => sum + p.lat, 0) / current.length;
    const centroidLng =
      current.reduce((sum, p) => sum + p.lng, 0) / current.length;

    if (
      haversineMeters(centroidLat, centroidLng, point.lat, point.lng) <=
      STAY_RADIUS_METERS
    ) {
      current.push(point);
    } else {
      clusters.push(current);
      current = [point];
    }
  }
  clusters.push(current);

  const gpsStays: DerivedStay[] = [];

  for (const cluster of clusters) {
    const first = cluster[0];
    const last = cluster[cluster.length - 1];
    const durationMinutes =
      (last.recordedAt.getTime() - first.recordedAt.getTime()) / 60000;

    if (durationMinutes < MIN_STAY_MINUTES) continue;

    const centroidLat =
      cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length;
    const centroidLng =
      cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length;

    const location = await findOrCreateLocation(userId, centroidLat, centroidLng);
    const roundedDuration = Math.round(durationMinutes);

    const visit = await prisma.placeVisit.create({
      data: {
        userId,
        locationId: location.id,
        dailyLogId: dailyLog.id,
        arrivedAt: first.recordedAt,
        departedAt: last.recordedAt,
        durationMinutes: roundedDuration,
      },
    });
    await prisma.$executeRaw`
      UPDATE place_visits
      SET geog = ST_SetSRID(ST_MakePoint(${centroidLng}, ${centroidLat}), 4326)::geography
      WHERE id = ${visit.id}
    `;

    gpsStays.push({
      id: location.id,
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      arrivedAt: first.recordedAt,
      departedAt: last.recordedAt,
      durationMinutes: roundedDuration,
      calendarEventTitle: matchCalendarEvent(
        dayEvents,
        first.recordedAt,
        last.recordedAt,
      )?.title,
    });
  }

  const sortedStays = [...manualStays, ...gpsStays].sort(
    (a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime(),
  );

  return {
    stays: sortedStays,
    trackPoints: points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      recordedAt: p.recordedAt,
    })),
    gaps: computeGaps(sortedStays, points),
  };
}
