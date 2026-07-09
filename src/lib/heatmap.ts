import { prisma } from "./prisma";
import { todayKey } from "./dates";
import { format } from "date-fns";

export type HeatmapDay = { date: string; ratio: number };
export type MonthLabel = { weekIndex: number; label: string };

// Denominator is "goals active right now," applied uniformly across the
// whole window — same approximation streak.ts makes. Exact historical
// accuracy would need to track the goal set as of each past day; not worth
// it for a personal consistency view.
export async function getHeatmapData(
  userId: string,
  weeks: number = 26,
  now: Date = new Date()
): Promise<{ weeksGrid: HeatmapDay[][]; monthLabels: MonthLabel[] }> {
  const dailyGoals = await prisma.goal.findMany({
    where: { userId, recurrence: "DAILY", archivedAt: null },
    select: { id: true },
  });
  const goalIds = dailyGoals.map((g) => g.id);
  const denominator = goalIds.length;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - dayOfWeek - (weeks - 1) * 7);

  const countByDay = new Map<string, number>();
  if (denominator > 0) {
    const completions = await prisma.completion.findMany({
      where: { goalId: { in: goalIds }, completed: true },
      select: { periodKey: true },
    });
    for (const c of completions) {
      countByDay.set(c.periodKey, (countByDay.get(c.periodKey) ?? 0) + 1);
    }
  }

  const weeksGrid: HeatmapDay[][] = [];
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;
  const cursor = new Date(start);

  for (let w = 0; w < weeks; w++) {
    if (cursor.getMonth() !== lastMonth) {
      monthLabels.push({ weekIndex: w, label: format(cursor, "MMM") });
      lastMonth = cursor.getMonth();
    }

    const column: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const key = todayKey(cursor);
      const count = countByDay.get(key) ?? 0;
      const ratio = denominator > 0 ? Math.min(1, count / denominator) : 0;
      column.push({ date: key, ratio });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeksGrid.push(column);
  }

  return { weeksGrid, monthLabels };
}
