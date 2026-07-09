import { format, startOfWeek, differenceInCalendarDays } from "date-fns";

export function todayKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function weekKey(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function periodKeyFor(
  recurrence: "DAILY" | "WEEKLY" | "ONE_OFF",
  date: Date = new Date()
): string {
  return recurrence === "WEEKLY" ? weekKey(date) : todayKey(date);
}

export function daysUntil(target: Date, from: Date = new Date()): number {
  return differenceInCalendarDays(target, from);
}

// 0 = Monday ... 6 = Sunday, matching weekKey's Monday-start convention.
export function dayOfWeekIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Parses a "yyyy-MM-dd" date-only string (e.g. from a <input type="date">)
 * as local midnight, not UTC midnight — avoids off-by-one dates in
 * timezones behind UTC when passed straight to `new Date(str)`.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}
