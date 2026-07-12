import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOrCreateLocation } from "@/lib/placeVisits";
import { parseDateParam, startOfDay } from "@/lib/dateParam";

interface ManualPinPayload {
  lat: number;
  lng: number;
  name?: string;
  date: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ManualPinPayload>;
  const { lat, lng, name, date } = body;

  if (typeof lat !== "number" || typeof lng !== "number" || !date) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const dateOnly = startOfDay(parseDateParam(date));
  const userId = session.user.id;

  const dailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: { userId, date: dateOnly },
    update: {},
  });

  const location = await findOrCreateLocation(userId, lat, lng, name);

  // GPSが無いので正確な滞在時刻は分からない。その日の正午を仮の到着時刻とする。
  const arrivedAt = new Date(dateOnly);
  arrivedAt.setHours(12, 0, 0, 0);

  const visit = await prisma.placeVisit.create({
    data: {
      userId,
      locationId: location.id,
      dailyLogId: dailyLog.id,
      arrivedAt,
      isManual: true,
    },
  });
  await prisma.$executeRaw`
    UPDATE place_visits
    SET geog = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${visit.id}
  `;

  return NextResponse.json({ ok: true, locationId: location.id });
}
