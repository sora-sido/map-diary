import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface GpsPointPayload {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  recordedAt: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<GpsPointPayload>;
  const { lat, lng, accuracy, speed, recordedAt } = body;

  if (typeof lat !== "number" || typeof lng !== "number" || !recordedAt) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const log = await prisma.gpsLog.create({
    data: {
      userId: session.user.id,
      recordedAt: new Date(recordedAt),
      lat,
      lng,
      accuracy: accuracy ?? null,
      speed: speed ?? null,
    },
  });

  await prisma.$executeRaw`
    UPDATE gps_logs
    SET geog = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${log.id}
  `;

  return NextResponse.json({ ok: true, id: log.id });
}
