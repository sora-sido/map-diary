import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const entry = await prisma.diaryEntry.findFirst({
    where: { userId: session.user.id, locationId: id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ note: entry?.contentMarkdown ?? "" });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = (await request.json()) as { note?: string };
  const note = body.note ?? "";

  const existing = await prisma.diaryEntry.findFirst({
    where: { userId: session.user.id, locationId: id },
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
        locationId: id,
        contentMarkdown: note,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
