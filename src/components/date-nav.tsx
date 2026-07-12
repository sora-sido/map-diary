"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, formatDateParam, isSameDay, today } from "@/lib/dateParam";

export interface DateNavEvent {
  title: string;
  startTime: string;
  endTime: string;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DateNav({
  date,
  events,
}: {
  date: Date;
  events: DateNavEvent[];
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(date.getFullYear(), date.getMonth(), 1),
  );

  const isToday = isSameDay(date, today());
  const label = date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const prev = formatDateParam(addDays(date, -1));
  const next = formatDateParam(addDays(date, 1));
  const todayDate = today();

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/60 p-1 shadow-lg ring-1 ring-white/60 backdrop-blur-xl">
      <Link
        href={`/?date=${prev}`}
        aria-label="前日"
        className={buttonVariants({
          variant: "ghost",
          size: "icon-sm",
          className: "rounded-full",
        })}
      >
        <ChevronLeft className="size-4" />
      </Link>

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }}
      >
        <PopoverTrigger className="rounded-full px-2 py-1 text-sm font-medium tracking-tight hover:bg-black/[0.04]">
          {isToday ? "今日" : label}
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-72 border-none bg-white/60 p-3 shadow-xl ring-1 ring-white/60 backdrop-blur-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="前の月"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold">
              {year}年{month + 1}月
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="rounded-full p-1 hover:bg-muted"
              aria-label="次の月"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cellDate, i) => {
              if (!cellDate) return <div key={`empty-${i}`} />;

              const isFuture = cellDate.getTime() > todayDate.getTime();
              const isSelected = isSameDay(cellDate, date);
              const isCellToday = isSameDay(cellDate, todayDate);

              if (isFuture) {
                return (
                  <span
                    key={cellDate.toISOString()}
                    className="flex h-8 items-center justify-center text-sm text-muted-foreground/30"
                  >
                    {cellDate.getDate()}
                  </span>
                );
              }

              return (
                <Link
                  key={cellDate.toISOString()}
                  href={`/?date=${formatDateParam(cellDate)}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-full text-sm hover:bg-muted",
                    isSelected && "bg-foreground text-background hover:bg-foreground",
                    !isSelected && isCellToday && "font-semibold ring-1 ring-foreground/30",
                  )}
                >
                  {cellDate.getDate()}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 border-t border-black/10 pt-3">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground/70">
              <CalendarIcon className="size-3" strokeWidth={2.5} />
              {label}の予定
            </p>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground">予定はありません。</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {events.map((event) => (
                  <li key={event.title + event.startTime} className="text-xs">
                    <span className="text-muted-foreground">
                      {formatEventTime(event.startTime)}
                    </span>{" "}
                    {event.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Link
        href={`/?date=${next}`}
        aria-label="翌日"
        aria-disabled={isToday}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm", className: "rounded-full" }),
          isToday && "pointer-events-none opacity-30",
        )}
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
