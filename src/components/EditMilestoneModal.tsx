"use client";

import { useState } from "react";
import { updateMilestone } from "@/lib/actions";
import { todayKey } from "@/lib/dates";
import Modal from "./Modal";

export default function EditMilestoneModal({
  label,
  targetDate,
  windowDays,
}: {
  label: string;
  targetDate: Date;
  windowDays: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        Edit countdown
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit countdown">
        <form
          action={async (formData) => {
            await updateMilestone(formData);
            setOpen(false);
          }}
          className="mt-4 space-y-4"
        >
          <div>
            <label className="text-xs text-muted">Label</label>
            <input
              name="label"
              required
              maxLength={60}
              autoFocus
              defaultValue={label}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="days until move-in"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Target date</label>
            <input
              type="date"
              name="targetDate"
              required
              defaultValue={todayKey(targetDate)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Ring scale (days)</label>
            <input
              type="number"
              name="windowDays"
              required
              min={1}
              max={3650}
              defaultValue={windowDays}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <p className="mt-1 text-xs text-muted">
              How many days out counts as a &quot;full&quot; ring — controls how fast it visibly drains.
            </p>
          </div>
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
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
