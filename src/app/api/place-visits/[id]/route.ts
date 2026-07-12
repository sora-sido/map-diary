import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface UpdateTimePayload {
  arrivedAt: string;
  departedAt: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const visit = await prisma.placeVisit.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!visit) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<UpdateTimePayload>;
  if (!body.arrivedAt) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const arrivedAt = new Date(body.arrivedAt);
  const departedAt = body.departedAt ? new Date(body.departedAt) : null;
  const durationMinutes = departedAt
    ? Math.round((departedAt.getTime() - arrivedAt.getTime()) / 60000)
    : null;

  // 一度手動で時刻を確定させたら、GPSの再クラスタリングで上書き・重複されないよう
  // isManualを立てる(syncPlaceVisitsはisManualな滞在を再計算対象から除外する)。
  await prisma.placeVisit.update({
    where: { id },
    data: { arrivedAt, departedAt, durationMinutes, isManual: true },
  });

  return NextResponse.json({ ok: true });
}
