import { prisma } from "./prisma";
import { todayKey } from "./dates";
import { format } from "date-fns";

export type HeatmapDay = { date: string; ratio: number };
export type MonthLabel = { weekIndex: number; label: string };

// Denominator is "goals due that weekday, right now" — same approximation
// streak.ts makes for historical goal-set changes. Exact historical
// accuracy would need to track the goal set as of each past day; not worth
// it for a personal consistency view.
export async function getHeatmapData(
  userId: string,
  weeks: number = 26,
  now: Date = new Date()
): Promise<{ weeksGrid: HeatmapDay[][]; monthLabels: MonthLabel[] }> {
  const dailyGoals = await prisma.goal.findMany({
    where: { userId, recurrence: "DAILY", archivedAt: null },
    select: { id: true, daysOfWeek: true },
  });
  const goalIds = dailyGoals.map((g) => g.id);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startDow = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - startDow - (weeks - 1) * 7);

  const completedByDay = new Map<string, Set<string>>();
  if (goalIds.length > 0) {
    const completions = await prisma.completion.findMany({
      where: { goalId: { in: goalIds }, completed: true },
      select: { goalId: true, periodKey: true },
    });
    for (const c of completions) {
      const set = completedByDay.get(c.periodKey) ?? new Set<string>();
      set.add(c.goalId);
      completedByDay.set(c.periodKey, set);
    }
  }

  function dueIdsFor(dow: number): string[] {
    return dailyGoals
      .filter((g) => g.daysOfWeek.length === 0 || g.daysOfWeek.includes(dow))
      .map((g) => g.id);
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
    for (let dow = 0; dow < 7; dow++) {
      const key = todayKey(cursor);
      const due = dueIdsFor(dow);
      const completedSet = completedByDay.get(key) ?? new Set<string>();
      const doneCount = due.filter((id) => completedSet.has(id)).length;
      const ratio = due.length > 0 ? Math.min(1, doneCount / due.length) : 0;
      column.push({ date: key, ratio });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeksGrid.push(column);
  }

  return { weeksGrid, monthLabels };
}
