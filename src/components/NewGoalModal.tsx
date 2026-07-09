"use client";

import { useState } from "react";
import { createGoal } from "@/lib/actions";
import Modal from "./Modal";
import DayOfWeekPicker from "./DayOfWeekPicker";

type CategoryOption = { id: string; name: string };

export default function NewGoalModal({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false);
  const [recurrence, setRecurrence] = useState<"DAILY" | "WEEKLY" | "ONE_OFF">("DAILY");
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
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_0_24px_-6px_var(--accent-glow)] transition-opacity hover:opacity-90"
      >
        + Add goal
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New goal">
        <form
          action={async (formData) => {
            await createGoal(formData);
            setOpen(false);
            reset();
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="text-xs text-muted">Title</label>
            <input
              name="title"
              required
              maxLength={80}
              autoFocus
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="Go to the gym"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Category</label>
            <select
              name="categoryId"
              defaultValue={categories[0]?.id}
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
              onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="DAILY">Every day / certain days</option>
              <option value="WEEKLY">Once a week (any day)</option>
              <option value="ONE_OFF">Just once, on a specific day</option>
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
          {recurrence === "ONE_OFF" && (
            <div>
              <label className="text-xs text-muted">Date</label>
              <input
                type="date"
                name="specificDate"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent [color-scheme:dark]"
              />
            </div>
          )}
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
