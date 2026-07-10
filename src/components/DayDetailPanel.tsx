"use client";

import { useEffect, useState, useTransition } from "react";
import { getDayDetail, toggleCompletion, type DayDetailGoal } from "@/lib/actions";
import { hexToRgba } from "@/lib/color";
import Modal from "./Modal";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DayDetailPanel({
  date,
  onClose,
}: {
  date: string | null;
  onClose: () => void;
}) {
  const [goals, setGoals] = useState<DayDetailGoal[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!date) {
      setGoals(null);
      return;
    }
    let cancelled = false;
    getDayDetail(date).then((result) => {
      if (!cancelled) setGoals(result);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function toggle(goal: DayDetailGoal) {
    if (!date || !goals) return;
    setGoals(goals.map((g) => (g.id === goal.id ? { ...g, completed: !g.completed } : g)));
    startTransition(() => {
      toggleCompletion(goal.id, "DAILY", date);
    });
  }

  return (
    <Modal open={date !== null} onClose={onClose} title={date ? formatDate(date) : ""}>
      <div className="mt-4 space-y-2">
        {goals === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted">No daily goals were due this day.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => toggle(goal)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: goal.completed ? goal.category.color : "var(--border)",
                      backgroundColor: goal.completed ? goal.category.color : "transparent",
                    }}
                  >
                    {goal.completed && (
                      <svg viewBox="0 0 12 10" className="h-3 w-3">
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
                    className={`flex-1 text-sm ${goal.completed ? "text-muted line-through" : "text-foreground"}`}
                  >
                    {goal.title}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      color: goal.category.color,
                      backgroundColor: hexToRgba(goal.category.color, 0.16),
                    }}
                  >
                    {goal.category.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="pt-2 text-xs text-muted">
          Tap any goal to correct history — useful if you forgot to check something off.
        </p>
      </div>
    </Modal>
  );
}
