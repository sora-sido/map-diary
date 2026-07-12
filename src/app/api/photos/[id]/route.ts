import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabaseStorage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const photo = await prisma.photo.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!photo) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove([photo.storagePath]);
  await prisma.photo.delete({ where: { id: photo.id } });

  return NextResponse.json({ ok: true });
}
