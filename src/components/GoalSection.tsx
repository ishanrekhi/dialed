"use client";

import { useState, useTransition } from "react";
import confetti from "canvas-confetti";
import { toggleCompletion } from "@/lib/actions";
import GoalItem, { type GoalRow } from "./GoalItem";

const ACCENT_COLOR = "#00e6c3";

export default function GoalSection({
  title,
  goals,
  initiallyCompleted,
  categories,
}: {
  title: string;
  goals: GoalRow[];
  initiallyCompleted: string[];
  categories: { id: string; name: string }[];
}) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(initiallyCompleted)
  );
  const [, startTransition] = useTransition();

  function handleToggle(goal: GoalRow) {
    const next = new Set(completedIds);
    const wasComplete = next.has(goal.id);
    if (wasComplete) {
      next.delete(goal.id);
    } else {
      next.add(goal.id);
    }
    setCompletedIds(next);

    if (!wasComplete && next.size === goals.length && goals.length > 0) {
      const celebrationColors = [
        ACCENT_COLOR,
        ...new Set(goals.map((g) => g.category.color)),
      ];
      const fire = (opts: confetti.Options) =>
        confetti({
          particleCount: 90,
          spread: 90,
          startVelocity: 45,
          colors: celebrationColors,
          ...opts,
        });
      fire({ origin: { x: 0.25, y: 0.65 }, angle: 60 });
      fire({ origin: { x: 0.75, y: 0.65 }, angle: 120 });
      fire({ origin: { x: 0.5, y: 0.55 }, particleCount: 140, spread: 110 });
    }

    startTransition(() => {
      toggleCompletion(goal.id, goal.recurrence);
    });
  }

  if (goals.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        <span className="text-xs font-medium text-muted">
          {completedIds.size}/{goals.length}
        </span>
      </div>
      <ul className="space-y-2.5">
        {goals.map((goal) => (
          <GoalItem
            key={goal.id}
            goal={goal}
            completed={completedIds.has(goal.id)}
            onToggle={() => handleToggle(goal)}
            categories={categories}
          />
        ))}
      </ul>
    </section>
  );
}
