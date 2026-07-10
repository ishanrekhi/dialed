import { prisma } from "./prisma";
import { todayKey, dayOfWeekIndex } from "./dates";

type DailyGoal = { id: string; daysOfWeek: number[] };
type StreakInputs = { dailyGoals: DailyGoal[]; completedByDay: Map<string, Set<string>> };

async function loadStreakInputs(userId: string): Promise<StreakInputs> {
  const dailyGoals = await prisma.goal.findMany({
    where: { userId, recurrence: "DAILY", archivedAt: null },
    select: { id: true, daysOfWeek: true },
  });
  if (dailyGoals.length === 0) return { dailyGoals, completedByDay: new Map() };

  const completions = await prisma.completion.findMany({
    where: { goalId: { in: dailyGoals.map((g) => g.id) }, completed: true },
    select: { goalId: true, periodKey: true },
  });

  const completedByDay = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = completedByDay.get(c.periodKey) ?? new Set<string>();
    set.add(c.goalId);
    completedByDay.set(c.periodKey, set);
  }

  return { dailyGoals, completedByDay };
}

function dueIdsFor(dailyGoals: DailyGoal[], dow: number): string[] {
  return dailyGoals
    .filter((g) => g.daysOfWeek.length === 0 || g.daysOfWeek.includes(dow))
    .map((g) => g.id);
}

function isDayFull(inputs: StreakInputs, date: Date): boolean {
  const due = dueIdsFor(inputs.dailyGoals, dayOfWeekIndex(date));
  const completedSet = inputs.completedByDay.get(todayKey(date)) ?? new Set<string>();
  return due.every((id) => completedSet.has(id));
}

// Consecutive days (walking backward from `now`) where every DAILY goal
// actually due that weekday was completed. A day with zero due goals (e.g.
// all goals are Mon/Wed/Fri and today is Tuesday) counts as complete by
// default — nothing was owed. Doesn't re-litigate history if the goal set
// changed — approximate, and fine for a personal tracker.
function computeCurrentStreak(
  inputs: StreakInputs,
  now: Date
): { count: number; dates: string[] } {
  const dates: string[] = [];
  let count = 0;
  const cursor = new Date(now);
  for (let i = 0; i < 365; i++) {
    const full = isDayFull(inputs, cursor);
    if (i === 0 && !full) {
      // Today isn't finished yet — don't break the streak over it, just
      // don't count it, and check whether yesterday was a full day.
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (!full) break;
    count += 1;
    dates.push(todayKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count, dates };
}

export async function getDailyStreak(userId: string, now: Date = new Date()): Promise<number> {
  const inputs = await loadStreakInputs(userId);
  if (inputs.dailyGoals.length === 0) return 0;
  return computeCurrentStreak(inputs, now).count;
}

// Date strings (yyyy-MM-dd) that make up the current unbroken streak — used
// to highlight that run of cells on the heatmap.
export async function getCurrentStreakDates(
  userId: string,
  now: Date = new Date()
): Promise<Set<string>> {
  const inputs = await loadStreakInputs(userId);
  if (inputs.dailyGoals.length === 0) return new Set();
  return new Set(computeCurrentStreak(inputs, now).dates);
}

// Longest-ever run and overall completion rate over the trailing `days`
// window — a bigger-picture pair of numbers than "current streak" alone.
export async function getLongTermStats(
  userId: string,
  now: Date = new Date(),
  days: number = 365
): Promise<{ longestStreak: number; completionRate: number }> {
  const inputs = await loadStreakInputs(userId);
  if (inputs.dailyGoals.length === 0) return { longestStreak: 0, completionRate: 0 };

  let longest = 0;
  let current = 0;
  let totalDue = 0;
  let totalDone = 0;

  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let i = 0; i < days; i++) {
    const due = dueIdsFor(inputs.dailyGoals, dayOfWeekIndex(cursor));
    const completedSet = inputs.completedByDay.get(todayKey(cursor)) ?? new Set<string>();
    const doneCount = due.filter((id) => completedSet.has(id)).length;

    totalDue += due.length;
    totalDone += doneCount;

    if (due.length > 0 && doneCount === due.length) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (due.length > 0) {
      current = 0;
    }
    // due.length === 0 neither extends nor breaks the run — nothing owed.

    cursor.setDate(cursor.getDate() + 1);
  }

  const completionRate = totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 0;
  return { longestStreak: longest, completionRate };
}
