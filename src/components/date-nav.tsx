import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, formatDateParam, isSameDay, today } from "@/lib/dateParam";

export function DateNav({ date }: { date: Date }) {
  const prev = formatDateParam(addDays(date, -1));
  const next = formatDateParam(addDays(date, 1));
  const isToday = isSameDay(date, today());

  const label = date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur-md">
      <Link
        href={`/map?date=${prev}`}
        aria-label="前日"
        className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "rounded-full" })}
      >
        <ChevronLeft className="size-4" />
      </Link>

      <Link
        href={isToday ? "/map" : `/map?date=${formatDateParam(today())}`}
        className="px-2 text-sm font-medium tracking-tight hover:underline"
      >
        {isToday ? "今日" : label}
      </Link>

      <Link
        href={`/map?date=${next}`}
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
