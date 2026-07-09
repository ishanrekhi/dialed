import { getPartner, getPendingInvite } from "@/lib/partner";
import { getActiveGoals, isGoalComplete, summarize } from "@/lib/progress";
import { getDailyStreak } from "@/lib/streak";
import { removePartnership } from "@/lib/actions";
import { hexToRgba } from "@/lib/color";
import InvitePartnerCard from "./InvitePartnerCard";
import ProgressBar from "./ProgressBar";
import StreakBadge from "./StreakBadge";

function PartnerGoalRow({
  title,
  categoryName,
  categoryColor,
  completed,
}: {
  title: string;
  categoryName: string;
  categoryColor: string;
  completed: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
        style={{
          borderColor: completed ? categoryColor : "var(--border)",
          backgroundColor: completed ? categoryColor : "transparent",
        }}
      >
        {completed && (
          <svg viewBox="0 0 12 10" className="h-2.5 w-2.5">
            <path
              d="M1 5L4.5 8.5L11 1"
              fill="none"
              stroke="#03211c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={`flex-1 truncate text-sm ${completed ? "text-muted line-through" : "text-foreground"}`}
      >
        {title}
      </span>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ color: categoryColor, backgroundColor: hexToRgba(categoryColor, 0.16) }}
      >
        {categoryName}
      </span>
    </li>
  );
}

export default async function PartnerSection({ userId }: { userId: string }) {
  const partnerInfo = await getPartner(userId);

  if (!partnerInfo) {
    const pendingInviteId = await getPendingInvite(userId);
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Partner</h2>
        <InvitePartnerCard pendingInviteId={pendingInviteId} />
      </section>
    );
  }

  const { partnershipId, partner } = partnerInfo;
  const [goals, streak] = await Promise.all([
    getActiveGoals(partner.id),
    getDailyStreak(partner.id),
  ]);
  const { total, completed } = summarize(goals);

  const todayGoals = goals.filter((g) => g.recurrence !== "WEEKLY");
  const weekGoals = goals.filter((g) => g.recurrence === "WEEKLY");

  const endPartnership = async () => {
    "use server";
    await removePartnership(partnershipId);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Partner</h2>
        <form action={endPartnership}>
          <button type="submit" className="text-xs text-muted hover:text-danger">
            End partnership
          </button>
        </form>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{partner.name ?? partner.email ?? "Your partner"}</p>
          <StreakBadge streak={streak} />
        </div>

        {total === 0 ? (
          <p className="text-sm text-muted">No goals on their board yet.</p>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Today&apos;s progress</span>
                <span>
                  {completed}/{total}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={completed} max={total} />
              </div>
            </div>

            {todayGoals.length > 0 && (
              <ul className="space-y-2">
                {todayGoals.map((g) => (
                  <PartnerGoalRow
                    key={g.id}
                    title={g.title}
                    categoryName={g.category.name}
                    categoryColor={g.category.color}
                    completed={isGoalComplete(g)}
                  />
                ))}
              </ul>
            )}

            {weekGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  This week
                </p>
                <ul className="space-y-2">
                  {weekGoals.map((g) => (
                    <PartnerGoalRow
                      key={g.id}
                      title={g.title}
                      categoryName={g.category.name}
                      categoryColor={g.category.color}
                      completed={isGoalComplete(g)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
