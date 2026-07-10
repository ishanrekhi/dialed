import { formatDistanceToNow } from "date-fns";
import { getGroupActivity, type ActivityItem } from "@/lib/group";
import ReactionBar from "./ReactionBar";

function describeActivity(item: ActivityItem): { emoji: string; text: string } {
  const name = item.user.name ?? item.user.email ?? "Someone";
  const payload = item.payload as Record<string, unknown> | null;

  switch (item.type) {
    case "STREAK_MILESTONE":
      return {
        emoji: "🔥",
        text: `${name} hit a ${String(payload?.streakCount ?? "")}-day streak`,
      };
    case "GROUP_GOAL_COMPLETED":
      return {
        emoji: "🎉",
        text: `Everyone finished "${String(payload?.goalTitle ?? "a group goal")}" today`,
      };
    case "MEMBER_JOINED":
      return { emoji: "👋", text: `${name} joined the group` };
  }
}

export default async function ActivityFeed({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const items = await getGroupActivity(groupId, userId);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Activity</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing yet — streaks and milestones will show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const { emoji, text } = describeActivity(item);
            return (
              <li key={item.id} className="rounded-xl border border-border bg-surface p-3">
                <p className="text-sm">
                  <span className="mr-1.5">{emoji}</span>
                  {text}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                  </span>
                  <ReactionBar activityId={item.id} reactions={item.reactions} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
