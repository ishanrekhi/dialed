import { getHeatmapData } from "@/lib/heatmap";
import { getCurrentStreakDates, getLongTermStats } from "@/lib/streak";
import HeatmapGrid from "./HeatmapGrid";

export default async function Heatmap({
  userId,
  currentStreak,
}: {
  userId: string;
  currentStreak: number;
}) {
  const [{ weeksGrid, monthLabels }, streakDates, longTerm] = await Promise.all([
    getHeatmapData(userId, 26),
    getCurrentStreakDates(userId),
    getLongTermStats(userId),
  ]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Consistency</h2>
        <p className="mt-1 text-xs text-muted">
          One square per day, last 6 months. Brighter = more of that day&apos;s goals got done.
          Click a day to see what happened, or fix a mistake.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold">{currentStreak}</p>
          <p className="text-xs text-muted">Current streak</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold">{longTerm.longestStreak}</p>
          <p className="text-xs text-muted">Longest streak</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <p className="text-xl font-bold">{longTerm.completionRate}%</p>
          <p className="text-xs text-muted">Completion rate</p>
        </div>
      </div>

      <HeatmapGrid weeksGrid={weeksGrid} monthLabels={monthLabels} streakDates={[...streakDates]} />
    </section>
  );
}
