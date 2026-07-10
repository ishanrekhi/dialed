"use client";

import { useState } from "react";
import { createGroupGoal } from "@/lib/actions";
import Modal from "../Modal";
import DayOfWeekPicker from "../DayOfWeekPicker";

export default function CreateGroupGoalModal({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [everyDay, setEveryDay] = useState(true);
  const [days, setDays] = useState<number[]>([]);

  function reset() {
    setRecurrence("DAILY");
    setEveryDay(true);
    setDays([]);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        + Group goal
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New group goal">
        <form
          action={async (formData) => {
            await createGroupGoal(formData);
            setOpen(false);
            reset();
          }}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <div>
            <label className="text-xs text-muted">Title</label>
            <input
              name="title"
              required
              maxLength={80}
              autoFocus
              placeholder="Everyone works out"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Repeats</label>
            <select
              name="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="DAILY">Every day / certain days</option>
              <option value="WEEKLY">Once a week (any day)</option>
            </select>
          </div>
          {recurrence === "DAILY" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={everyDay}
                  onChange={(e) => setEveryDay(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Every day
              </label>
              {!everyDay && (
                <>
                  <DayOfWeekPicker value={days} onChange={setDays} />
                  {days.length === 0 && (
                    <p className="text-xs text-danger">Pick at least one day.</p>
                  )}
                </>
              )}
              <input type="hidden" name="daysOfWeek" value={everyDay ? "" : days.join(",")} />
            </div>
          )}
          <p className="text-xs text-muted">
            Everyone currently in the group gets this added to their own board.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recurrence === "DAILY" && !everyDay && days.length === 0}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
