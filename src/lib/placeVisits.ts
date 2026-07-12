import { prisma } from "@/lib/prisma";
import { haversineMeters } from "@/lib/geo";
import { addDays, startOfDay } from "@/lib/dateParam";

export interface DerivedStay {
  id: string;
  name: string;
  lat: number;
  lng: number;
  arrivedAt: Date;
  departedAt: Date;
  durationMinutes: number;
  /** 滞在時間帯と重なるGoogleカレンダー予定のタイトル(あれば)。 */
  calendarEventTitle?: string;
}

export interface DerivedTrackPoint {
  lat: number;
  lng: number;
  recordedAt: Date;
}

const STAY_RADIUS_METERS = 120;
const MIN_STAY_MINUTES = 5;

async function findOrCreateLocation(userId: string, lat: number, lng: number) {
  const existing = await prisma.location.findMany({ where: { userId } });
  const nearby = existing.find(
    (loc) => haversineMeters(loc.lat, loc.lng, lat, lng) <= STAY_RADIUS_METERS,
  );
  if (nearby) return nearby;

  const created = await prisma.location.create({
    data: {
      userId,
      name: `未設定の場所 (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
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

/**
 * 指定日のgps_logsから滞在(place_visits)をシンプルな逐次クラスタリングで再計算する。
 * syncTodayEvents(Calendar)と同じく、ページ表示のたびに再計算する冪等な設計。
 * 半径STAY_RADIUS_METERS以内に留まった時間がMIN_STAY_MINUTES以上の区間を1滞在とみなす。
 */
export async function syncPlaceVisits(
  userId: string,
  targetDate: Date,
): Promise<{
  stays: DerivedStay[];
  trackPoints: DerivedTrackPoint[];
}> {
  const dateOnly = startOfDay(targetDate);
  const nextDay = addDays(dateOnly, 1);

  const points = await prisma.gpsLog.findMany({
    where: { userId, recordedAt: { gte: dateOnly, lt: nextDay } },
    orderBy: { recordedAt: "asc" },
  });

  if (points.length < 2) {
    return {
      stays: [],
      trackPoints: points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        recordedAt: p.recordedAt,
      })),
    };
  }

  const dailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: { userId, date: dateOnly },
    update: {},
  });

  await prisma.placeVisit.deleteMany({
    where: { userId, dailyLogId: dailyLog.id },
  });

  // 滞在時間帯と重なるカレンダー予定を後で突き合わせるため、その日の予定を先に取得しておく。
  const dayEvents = await prisma.calendarEvent.findMany({
    where: { userId, startTime: { lt: nextDay }, endTime: { gt: dateOnly } },
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

  const stays: DerivedStay[] = [];

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

    const matchedEvent = dayEvents.find(
      (event) => event.startTime < last.recordedAt && event.endTime > first.recordedAt,
    );

    stays.push({
      id: location.id,
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      arrivedAt: first.recordedAt,
      departedAt: last.recordedAt,
      durationMinutes: roundedDuration,
      calendarEventTitle: matchedEvent?.title,
    });
  }

  return {
    stays,
    trackPoints: points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      recordedAt: p.recordedAt,
    })),
  };
}
