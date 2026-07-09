import { prisma } from "./prisma";
import { todayKey } from "./dates";

// Consecutive days where every currently-active DAILY goal was completed.
// Doesn't re-litigate history if the goal set changed — approximate, and
// fine for a personal tracker.
export async function getDailyStreak(
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const dailyGoals = await prisma.goal.findMany({
    where: { userId, recurrence: "DAILY", archivedAt: null },
    select: { id: true },
  });
  if (dailyGoals.length === 0) return 0;
  const goalIds = dailyGoals.map((g) => g.id);

  const completions = await prisma.completion.findMany({
    where: { goalId: { in: goalIds }, completed: true },
    select: { periodKey: true },
  });

  const countByDay = new Map<string, number>();
  for (const c of completions) {
    countByDay.set(c.periodKey, (countByDay.get(c.periodKey) ?? 0) + 1);
  }

  let streak = 0;
  const cursor = new Date(now);
  for (let i = 0; i < 365; i++) {
    const key = todayKey(cursor);
    const isFull = (countByDay.get(key) ?? 0) >= goalIds.length;
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
