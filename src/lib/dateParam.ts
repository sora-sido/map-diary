/** "YYYY-MM-DD" 形式の文字列⇔その日のローカル午前0時のDateを相互変換する。 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function today(): Date {
  return startOfDay(new Date());
}

/** 不正な値やクエリ未指定の場合は今日の日付にフォールバックする。 */
export function parseDateParam(value: string | undefined): Date {
  if (!value) return today();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return today();

  const [, y, m, d] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(parsed.getTime())) return today();
  return parsed;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
