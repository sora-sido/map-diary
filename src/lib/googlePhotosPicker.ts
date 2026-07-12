import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabaseStorage";
import { startOfDay } from "@/lib/dateParam";

const PICKER_BASE = "https://photospicker.googleapis.com/v1";

async function getAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.googleRefreshToken) {
    throw new Error(
      "Google連携のrefresh tokenがありません。一度ログアウトして再ログインしてください。",
    );
  }
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Googleアクセストークンの取得に失敗しました。");
  return token;
}

export interface PickerSessionInfo {
  id: string;
  pickerUri: string;
  mediaItemsSet: boolean;
}

export async function createPickerSession(
  userId: string,
): Promise<PickerSessionInfo> {
  const accessToken = await getAccessToken(userId);
  const res = await fetch(`${PICKER_BASE}/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Picker セッション作成に失敗しました (${res.status})`);
  }
  const data = await res.json();
  return {
    id: data.id,
    pickerUri: data.pickerUri,
    mediaItemsSet: Boolean(data.mediaItemsSet),
  };
}

export async function getPickerSession(
  userId: string,
  sessionId: string,
): Promise<PickerSessionInfo> {
  const accessToken = await getAccessToken(userId);
  const res = await fetch(`${PICKER_BASE}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Picker セッション取得に失敗しました (${res.status})`);
  }
  const data = await res.json();
  return {
    id: data.id,
    pickerUri: data.pickerUri,
    mediaItemsSet: Boolean(data.mediaItemsSet),
  };
}

interface PickedMediaItem {
  id: string;
  createTime: string;
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename: string;
  };
}

async function listPickedMediaItems(
  accessToken: string,
  sessionId: string,
): Promise<PickedMediaItem[]> {
  const items: PickedMediaItem[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${PICKER_BASE}/mediaItems`);
    url.searchParams.set("sessionId", sessionId);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Picker mediaItems取得に失敗しました (${res.status})`);
    }
    const data = await res.json();
    items.push(...(data.mediaItems ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

/**
 * セッションで選択済みの写真をダウンロードしてSupabase Storageへ保存し、
 * 指定日のdaily_logs単位でphotosテーブルへ記録する(場所への自動紐付けは行わない。
 * Picker APIはGPS/EXIF位置情報を返さないため)。
 */
export async function importPickedPhotos(
  userId: string,
  sessionId: string,
  targetDate: Date,
) {
  const accessToken = await getAccessToken(userId);
  const items = await listPickedMediaItems(accessToken, sessionId);

  const dateOnly = startOfDay(targetDate);
  const dailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: { userId, date: dateOnly },
    update: {},
  });

  // ダウンロード→アップロードはネットワークI/O待ちが支配的なので、
  // 件数分を直列に処理せず並列で行う(数枚選ぶと体感速度が大きく変わる)。
  const results = await Promise.all(
    items.map(async (item) => {
      const storagePath = `${userId}/${dateOnly.toISOString().slice(0, 10)}/${item.id}-${item.mediaFile.filename}`;

      const existing = await prisma.photo.findFirst({
        where: { userId, storagePath },
      });
      if (existing) return existing;

      const downloadUrl = `${item.mediaFile.baseUrl}=d`;
      const fileRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!fileRes.ok) return null;
      const bytes = new Uint8Array(await fileRes.arrayBuffer());

      const { error } = await supabaseAdmin.storage
        .from(PHOTOS_BUCKET)
        .upload(storagePath, bytes, {
          contentType: item.mediaFile.mimeType,
          upsert: true,
        });
      if (error) return null;

      return prisma.photo.create({
        data: {
          userId,
          dailyLogId: dailyLog.id,
          storagePath,
          takenAt: new Date(item.createTime),
        },
      });
    }),
  );

  return results.filter((photo) => photo !== null);
}
