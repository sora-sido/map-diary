import { prisma } from "@/lib/prisma";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabaseStorage";
import { startOfDay } from "@/lib/dateParam";

export interface PhotoWithUrl {
  id: string;
  takenAt: Date | null;
  url: string | null;
}

/** 指定日にPickerで取り込まれた写真を、署名付きURL付きで取得する。 */
export async function getPhotosForDate(
  userId: string,
  targetDate: Date,
): Promise<PhotoWithUrl[]> {
  const dateOnly = startOfDay(targetDate);
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
