import { prisma } from "./prisma";
import { todayKey, dayOfWeekIndex } from "./dates";

// Consecutive days where every DAILY goal actually due that weekday was
// completed. A day with zero due goals (e.g. all goals are Mon/Wed/Fri and
// today is Tuesday) counts as complete by default — nothing was owed.
// Doesn't re-litigate history if the goal set changed — approximate, and
// fine for a personal tracker.
export async function getDailyStreak(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const dailyGoals = await prisma.goal.findMany({
    where: { userId, recurrence: "DAILY", archivedAt: null },
    select: { id: true, daysOfWeek: true },
  });
  if (dailyGoals.length === 0) return 0;
  const goalIds = dailyGoals.map((g) => g.id);

  const completions = await prisma.completion.findMany({
    where: { goalId: { in: goalIds }, completed: true },
    select: { goalId: true, periodKey: true },
  });

  const completedByDay = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = completedByDay.get(c.periodKey) ?? new Set<string>();
    set.add(c.goalId);
    completedByDay.set(c.periodKey, set);
  }

  function dueIdsFor(dow: number): string[] {
    return dailyGoals
      .filter((g) => g.daysOfWeek.length === 0 || g.daysOfWeek.includes(dow))
      .map((g) => g.id);
  }

  let streak = 0;
  const cursor = new Date(now);
  for (let i = 0; i < 365; i++) {
    const dow = dayOfWeekIndex(cursor);
    const due = dueIdsFor(dow);
    const key = todayKey(cursor);
    const completedSet = completedByDay.get(key) ?? new Set<string>();
    const isFull = due.every((id) => completedSet.has(id));

    if (i === 0 && !isFull) {
      // Today isn't finished yet — don't break the streak over it, just
      // don't count it, and check whether yesterday was a full day.
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!isFull) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
