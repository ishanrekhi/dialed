export default function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) {
    return (
      <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted">
        No streak. Yet.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
      <span aria-hidden>🔥</span>
      {streak}-day streak
    </div>
  );
}
