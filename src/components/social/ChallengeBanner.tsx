import { differenceInCalendarDays } from "date-fns";
import { getActiveChallenge, getChallengeLeaderboard } from "@/lib/group";
import { daysUntil } from "@/lib/dates";
import CountdownRing from "../CountdownRing";
import CreateChallengeModal from "./CreateChallengeModal";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default async function ChallengeBanner({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const challenge = await getActiveChallenge(groupId);

  if (!challenge) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Challenge</h2>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted">No active challenge right now.</p>
          <CreateChallengeModal groupId={groupId} />
        </div>
      </section>
    );
  }

  const daysLeft = daysUntil(challenge.endDate);
  const windowDays = Math.max(1, differenceInCalendarDays(challenge.endDate, challenge.startDate) + 1);
  const leaderboard = await getChallengeLeaderboard(challenge.id);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Challenge</h2>
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <CountdownRing daysLeft={daysLeft} windowDays={windowDays} label={challenge.title} />
          <ul className="w-full flex-1 space-y-2">
            {leaderboard.map((entry, i) => {
              const isYou = entry.member.id === userId;
              return (
                <li
                  key={entry.member.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                    isYou ? "border-accent bg-accent-soft" : "border-border"
                  }`}
                >
                  <span className="w-6 shrink-0 text-center">
                    {RANK_MEDALS[i] ?? `#${i + 1}`}
                  </span>
                  <span className="flex-1 truncate font-medium">
                    {entry.member.name ?? entry.member.email ?? "Someone"}
                    {isYou && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{entry.completionRate}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
