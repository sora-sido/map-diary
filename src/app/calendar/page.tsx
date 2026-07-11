import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncTodayEvents } from "@/lib/googleCalendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatTime(date: Date) {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/");
  }

  const events = await syncTodayEvents(session.user.id);
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">今日の予定</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground">今日の予定はありません。</p>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <Card key={event.googleEventId}>
              <CardHeader>
                <CardTitle className="text-lg">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
                {event.location && <p>{event.location}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
