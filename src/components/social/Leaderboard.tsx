import { getGroupLeaderboard } from "@/lib/group";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default async function Leaderboard({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const entries = await getGroupLeaderboard(groupId);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Leaderboard</h2>
      <ul className="space-y-2">
        {entries.map((entry, i) => {
          const isYou = entry.member.id === userId;
          return (
            <li
              key={entry.member.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                isYou ? "border-accent bg-accent-soft" : "border-border bg-surface"
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm">
                {RANK_MEDALS[i] ?? `#${i + 1}`}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {entry.member.name ?? entry.member.email ?? "Someone"}
                {isYou && <span className="ml-1.5 text-xs text-muted">(you)</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">
                🔥 {entry.streak}d · best {entry.longestStreak}d · {entry.completionRate}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
