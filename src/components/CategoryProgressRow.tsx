import ProgressBar from "./ProgressBar";

export default function CategoryProgressRow({
  category,
  completed,
  total,
}: {
  category: { name: string; color: string };
  completed: number;
  total: number;
}) {
  if (total === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: category.color }}>{category.name}</span>
        <span className="text-muted">
          {completed}/{total}
        </span>
      </div>
      <ProgressBar value={completed} max={total} colorVar={category.color} />
    </div>
  );
}
