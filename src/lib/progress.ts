import { prisma } from "./prisma";
import { todayKey, weekKey, periodKeyFor, dayOfWeekIndex } from "./dates";
import type { Category, Goal, Completion, Prisma } from "@prisma/client";

export type GoalWithCompletion = Goal & { category: Category; completions: Completion[] };

export async function getActiveGoals(
  userId: string,
  now: Date = new Date()
): Promise<GoalWithCompletion[]> {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const tKey = todayKey(now);
  const wKey = weekKey(now);
  const todayDow = dayOfWeekIndex(now);

  const dailyFilter: Prisma.GoalWhereInput = {
    recurrence: "DAILY",
    OR: [{ daysOfWeek: { isEmpty: true } }, { daysOfWeek: { has: todayDow } }],
  };

  return prisma.goal.findMany({
    where: {
      userId,
      archivedAt: null,
      OR: [
        { recurrence: "WEEKLY" },
        dailyFilter,
        { recurrence: "ONE_OFF", specificDate: { gte: dayStart, lt: dayEnd } },
      ],
    },
    include: {
      category: true,
      completions: { where: { periodKey: { in: [tKey, wKey] } } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function isGoalComplete(goal: GoalWithCompletion, now: Date = new Date()): boolean {
  const key = periodKeyFor(goal.recurrence, now);
  return goal.completions.some((c) => c.periodKey === key && c.completed);
}

export function summarize(goals: GoalWithCompletion[], now: Date = new Date()) {
  const total = goals.length;
  const completed = goals.filter((g) => isGoalComplete(g, now)).length;

  const byCategory = new Map<string, { category: Category; total: number; completed: number }>();
  for (const g of goals) {
    const entry = byCategory.get(g.categoryId) ?? { category: g.category, total: 0, completed: 0 };
    entry.total += 1;
    if (isGoalComplete(g, now)) entry.completed += 1;
    byCategory.set(g.categoryId, entry);
  }

  return { total, completed, byCategory: [...byCategory.values()] };
}
