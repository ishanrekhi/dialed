import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getActiveGoals, isGoalComplete, summarize } from "@/lib/progress";
import { getDailyStreak } from "@/lib/streak";
import { getMilestone } from "@/lib/milestone";
import { daysUntil } from "@/lib/dates";
import CountdownRing from "@/components/CountdownRing";
import StreakBadge from "@/components/StreakBadge";
import ProgressBar from "@/components/ProgressBar";
import CategoryProgressRow from "@/components/CategoryProgressRow";
import GoalSection from "@/components/GoalSection";
import NewGoalModal from "@/components/NewGoalModal";
import EmptyState from "@/components/EmptyState";
import EditMilestoneModal from "@/components/EditMilestoneModal";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import Heatmap from "@/components/Heatmap";

export default async function HomePage() {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardedAt: true },
  });
  if (!user?.onboardedAt) redirect("/onboarding");

  const [goals, streak, milestone, categories] = await Promise.all([
    getActiveGoals(userId),
    getDailyStreak(userId),
    getMilestone(userId),
    prisma.category.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: { _count: { select: { goals: true } } },
    }),
  ]);

  const { total, completed, byCategory } = summarize(goals);
  const daysLeft = daysUntil(milestone.targetDate);

  const todayGoals = goals.filter((g) => g.recurrence !== "WEEKLY");
  const weekGoals = goals.filter((g) => g.recurrence === "WEEKLY");

  const todayCompletedIds = todayGoals.filter((g) => isGoalComplete(g)).map((g) => g.id);
  const weekCompletedIds = weekGoals.filter((g) => isGoalComplete(g)).map((g) => g.id);
  const todayFullyDone = todayGoals.length > 0 && todayCompletedIds.length === todayGoals.length;

  const subtext = todayFullyDone
    ? "Today's locked. Come back tomorrow and stack another."
    : streak > 0
      ? "Don't break the chain."
      : "Today's a good day to start one.";

  const toRow = (g: (typeof goals)[number]) => ({
    id: g.id,
    title: g.title,
    category: g.category,
    recurrence: g.recurrence,
    specificDate: g.specificDate,
    daysOfWeek: g.daysOfWeek,
  });

  const categoryRows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    goalCount: c._count.goals,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
        <CountdownRing daysLeft={daysLeft} windowDays={milestone.windowDays} label={milestone.label} />
        <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Dial <span className="text-accent">in</span>.
          </h1>
          <p className="max-w-sm text-sm text-muted">{subtext}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StreakBadge streak={streak} />
            <EditMilestoneModal
              label={milestone.label}
              targetDate={milestone.targetDate}
              windowDays={milestone.windowDays}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Today &amp; this week</h2>
        <div className="flex items-center gap-2">
          <CategoryManagerModal categories={categoryRows} />
          <NewGoalModal categories={categoryRows} />
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall</span>
              <span className="text-muted">
                {completed}/{total}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar value={completed} max={total} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {byCategory.map(({ category, completed, total }) => (
              <CategoryProgressRow
                key={category.id}
                category={category}
                completed={completed}
                total={total}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {total === 0 ? (
          <EmptyState
            title="No goals yet"
            subtitle="Add your first goal to start tracking progress."
          />
        ) : (
          <>
            <GoalSection
              title="Today"
              goals={todayGoals.map(toRow)}
              initiallyCompleted={todayCompletedIds}
              categories={categoryRows}
            />
            <GoalSection
              title="This Week"
              goals={weekGoals.map(toRow)}
              initiallyCompleted={weekCompletedIds}
              categories={categoryRows}
            />
          </>
        )}
      </div>

      <div className="mt-10">
        <Heatmap userId={userId} currentStreak={streak} />
      </div>
    </div>
  );
}
