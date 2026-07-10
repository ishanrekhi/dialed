import { getGroupGoals } from "@/lib/group";
import CreateGroupGoalModal from "./CreateGroupGoalModal";

function initials(name: string | null, email: string | null): string {
  const source = name ?? email ?? "?";
  return source.trim()[0]?.toUpperCase() ?? "?";
}

export default async function GroupGoalsSection({ groupId }: { groupId: string }) {
  const groupGoals = await getGroupGoals(groupId);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Group goals</h2>
        <CreateGroupGoalModal groupId={groupId} />
      </div>

      {groupGoals.length === 0 ? (
        <p className="text-sm text-muted">
          No shared goals yet — add one and it lands on everyone&apos;s board.
        </p>
      ) : (
        <ul className="space-y-2">
          {groupGoals.map((gg) => (
            <li key={gg.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{gg.title}</p>
                <span className="text-xs text-muted">
                  {gg.members.filter((m) => m.completed).length}/{gg.members.length}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {gg.members.map(({ member, completed }) => (
                  <span
                    key={member.id}
                    title={`${member.name ?? member.email ?? "Someone"} — ${completed ? "done" : "not yet"}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold"
                    style={{
                      borderColor: completed ? "var(--accent)" : "var(--border)",
                      backgroundColor: completed ? "var(--accent-soft)" : "transparent",
                      color: completed ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {initials(member.name, member.email)}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
