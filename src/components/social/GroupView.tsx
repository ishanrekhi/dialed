import { getUserGroup, getPendingInvite } from "@/lib/group";
import { getActiveGoals, isGoalComplete, summarize } from "@/lib/progress";
import { getDailyStreak } from "@/lib/streak";
import { leaveGroup } from "@/lib/actions";
import CreateGroupCard from "./CreateGroupCard";
import ActivityFeed from "./ActivityFeed";
import Leaderboard from "./Leaderboard";
import GroupGoalsSection from "./GroupGoalsSection";
import ChallengeBanner from "./ChallengeBanner";
import ProgressBar from "../ProgressBar";
import StreakBadge from "../StreakBadge";

async function MemberCard({
  member,
  isYou,
}: {
  member: { id: string; name: string | null; email: string | null };
  isYou: boolean;
}) {
  const [goals, streak] = await Promise.all([
    getActiveGoals(member.id),
    getDailyStreak(member.id),
  ]);

  const todayGoals = goals.filter((g) => g.recurrence !== "WEEKLY");
  const weekGoals = goals.filter((g) => g.recurrence === "WEEKLY");
  const today = summarize(todayGoals);
  const week = summarize(weekGoals);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-medium">
          {member.name ?? member.email ?? "Someone"}
          {isYou && <span className="ml-1.5 text-xs text-muted">(you)</span>}
        </p>
        <StreakBadge streak={streak} />
      </div>

      {today.total === 0 && week.total === 0 ? (
        <p className="text-sm text-muted">No goals on their board yet.</p>
      ) : (
        <div className="space-y-2.5">
          {today.total > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Today</span>
                <span>
                  {today.completed}/{today.total}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar value={today.completed} max={today.total} />
              </div>
            </div>
          )}
          {week.total > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>This week</span>
                <span>
                  {week.completed}/{week.total}
                </span>
              </div>
              <div className="mt-1.5">
                <ProgressBar value={week.completed} max={week.total} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default async function GroupView({ userId }: { userId: string }) {
  const group = await getUserGroup(userId);

  if (!group) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Group</h2>
        <CreateGroupCard pendingInviteId={null} groupId={null} />
      </section>
    );
  }

  const pendingInviteId = await getPendingInvite(group.id);

  const leave = async () => {
    "use server";
    await leaveGroup();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {group.name}
        </h2>
        <form action={leave}>
          <button type="submit" className="text-xs text-muted hover:text-danger">
            Leave group
          </button>
        </form>
      </div>

      <CreateGroupCard pendingInviteId={pendingInviteId} groupId={group.id} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {group.members.map((member) => (
          <MemberCard key={member.id} member={member} isYou={member.id === userId} />
        ))}
      </div>

      <div className="pt-4">
        <ChallengeBanner groupId={group.id} userId={userId} />
      </div>

      <div className="pt-4">
        <Leaderboard groupId={group.id} userId={userId} />
      </div>

      <div className="pt-4">
        <GroupGoalsSection groupId={group.id} />
      </div>

      <div className="pt-4">
        <ActivityFeed groupId={group.id} userId={userId} />
      </div>
    </section>
  );
}
