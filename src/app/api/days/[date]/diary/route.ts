import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateParam } from "@/lib/dateParam";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { date } = await params;
  const targetDate = parseDateParam(date);

  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId: session.user.id, date: targetDate } },
  });
  if (!dailyLog) {
    return NextResponse.json({ note: "" });
  }

  const entry = await prisma.diaryEntry.findFirst({
    where: { userId: session.user.id, dailyLogId: dailyLog.id, locationId: null },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ note: entry?.contentMarkdown ?? "" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { date } = await params;
  const targetDate = parseDateParam(date);

  const body = (await request.json()) as { note?: string };
  const note = body.note ?? "";

  const dailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId: session.user.id, date: targetDate } },
    create: { userId: session.user.id, date: targetDate },
    update: {},
  });

  const existing = await prisma.diaryEntry.findFirst({
    where: { userId: session.user.id, dailyLogId: dailyLog.id, locationId: null },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    await prisma.diaryEntry.update({
      where: { id: existing.id },
      data: { contentMarkdown: note },
    });
  } else {
    await prisma.diaryEntry.create({
      data: {
        userId: session.user.id,
        dailyLogId: dailyLog.id,
        contentMarkdown: note,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
