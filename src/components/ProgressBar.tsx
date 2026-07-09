export default function ProgressBar({
  value,
  max,
  colorVar = "var(--accent)",
}: {
  value: number;
  max: number;
  colorVar?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: colorVar }}
      />
    </div>
  );
}
