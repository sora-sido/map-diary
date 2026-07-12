import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "@/lib/dateParam";

export interface SimpleCalendarEvent {
  googleEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
}

function getOAuth2Client(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** その日(ローカル時間 00:00〜23:59)のGoogleカレンダー予定を取得する。 */
export async function fetchTodayEvents(
  userId: string,
): Promise<SimpleCalendarEvent[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.googleRefreshToken) return [];

  const auth = getOAuth2Client(user.googleRefreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
  );
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? [])
    .filter((event) => event.id && event.start && event.end)
    .map((event) => ({
      googleEventId: event.id!,
      title: event.summary ?? "(タイトルなし)",
      description: event.description ?? null,
      location: event.location ?? null,
      startTime: new Date(event.start!.dateTime ?? event.start!.date!),
      endTime: new Date(event.end!.dateTime ?? event.end!.date!),
    }));
}

/** 今日の予定を取得し、daily_logs/calendar_eventsへ保存(upsert)した上で返す。 */
export async function syncTodayEvents(
  userId: string,
): Promise<SimpleCalendarEvent[]> {
  const events = await fetchTodayEvents(userId);

  const today = new Date();
  const dateOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const dailyLog = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: { userId, date: dateOnly },
    update: {},
  });

  for (const event of events) {
    await prisma.calendarEvent.upsert({
      where: { googleEventId: event.googleEventId },
      create: {
        userId,
        dailyLogId: dailyLog.id,
        googleEventId: event.googleEventId,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
      },
      update: {
        dailyLogId: dailyLog.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        endTime: event.endTime,
      },
    });
  }

  return events;
}

/**
 * 過去日のGoogleカレンダー予定を取得する。Google APIへは問い合わせず、
 * その日が「今日」だった時にsyncTodayEventsで保存されたcalendar_eventsを読むだけ。
 */
export async function getCalendarEventsForDate(
  userId: string,
  targetDate: Date,
): Promise<SimpleCalendarEvent[]> {
  const dateOnly = startOfDay(targetDate);
  const nextDay = addDays(dateOnly, 1);

  const events = await prisma.calendarEvent.findMany({
    where: { userId, startTime: { lt: nextDay }, endTime: { gt: dateOnly } },
    orderBy: { startTime: "asc" },
  });

  return events.map((event) => ({
    googleEventId: event.googleEventId,
    title: event.title,
    description: event.description,
    location: event.location,
    startTime: event.startTime,
    endTime: event.endTime,
  }));
}
