"use client";

import { useState } from "react";
import { updateGoal, archiveGoal } from "@/lib/actions";
import { todayKey } from "@/lib/dates";
import Modal from "./Modal";
import type { Recurrence } from "@prisma/client";

type CategoryOption = { id: string; name: string };
type GoalDetail = {
  id: string;
  title: string;
  categoryId: string;
  recurrence: Recurrence;
  specificDate: Date | null;
};

export default function EditGoalModal({
  open,
  onClose,
  goal,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  goal: GoalDetail;
  categories: CategoryOption[];
}) {
  const [recurrence, setRecurrence] = useState<Recurrence>(goal.recurrence);

  return (
    <Modal open={open} onClose={onClose} title="Edit goal">
      <form
        action={async (formData) => {
          await updateGoal(formData);
          onClose();
        }}
        className="mt-4 space-y-4"
      >
        <input type="hidden" name="goalId" value={goal.id} />
        <div>
          <label className="text-xs text-muted">Title</label>
          <input
            name="title"
            required
            maxLength={80}
            autoFocus
            defaultValue={goal.title}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Category</label>
          <select
            name="categoryId"
            defaultValue={goal.categoryId}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted">Repeats</label>
          <select
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="DAILY">Every day</option>
            <option value="WEEKLY">Every week</option>
            <option value="ONE_OFF">Just once, on a specific day</option>
          </select>
        </div>
        {recurrence === "ONE_OFF" && (
          <div>
            <label className="text-xs text-muted">Date</label>
            <input
              type="date"
              name="specificDate"
              required
              defaultValue={todayKey(goal.specificDate ?? new Date())}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent [color-scheme:dark]"
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={async () => {
              await archiveGoal(goal.id);
              onClose();
            }}
            className="text-sm text-muted hover:text-danger"
          >
            Delete goal
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
