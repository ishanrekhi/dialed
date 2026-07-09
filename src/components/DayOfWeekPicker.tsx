"use client";

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DayOfWeekPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(
      value.includes(day)
        ? value.filter((d) => d !== day)
        : [...value, day].sort((a, b) => a - b)
    );
  }

  return (
    <div className="flex gap-1.5">
      {DAY_LABELS.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => toggle(i)}
          aria-pressed={value.includes(i)}
          className={`h-9 w-9 shrink-0 rounded-full border-2 text-xs font-semibold transition-colors ${
            value.includes(i)
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-muted hover:bg-surface-hover"
          }`}
        >
          {label[0]}
        </button>
      ))}
    </div>
  );
}
