import { prisma } from "@/lib/prisma";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabaseStorage";

export interface PhotoWithUrl {
  id: string;
  takenAt: Date | null;
  url: string | null;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** 今日撮影された(=Pickerで取り込まれた)写真を、署名付きURL付きで取得する。 */
export async function getTodayPhotos(userId: string): Promise<PhotoWithUrl[]> {
  const dateOnly = startOfToday();
  const dailyLog = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId, date: dateOnly } },
  });
  if (!dailyLog) return [];

  const photos = await prisma.photo.findMany({
    where: { userId, dailyLogId: dailyLog.id },
    orderBy: { takenAt: "asc" },
  });

  return Promise.all(
    photos.map(async (photo) => {
      const { data } = await supabaseAdmin.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(photo.storagePath, 60 * 60);
      return { id: photo.id, takenAt: photo.takenAt, url: data?.signedUrl ?? null };
    }),
  );
}
