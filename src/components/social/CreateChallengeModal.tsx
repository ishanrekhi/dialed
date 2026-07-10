"use client";

import { useState } from "react";
import { createChallenge } from "@/lib/actions";
import Modal from "../Modal";

export default function CreateChallengeModal({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-hover"
      >
        Start a challenge
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New challenge">
        <form
          action={async (formData) => {
            await createChallenge(formData);
            setOpen(false);
          }}
          className="mt-4 space-y-4"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <div>
            <label className="text-xs text-muted">Title</label>
            <input
              name="title"
              required
              maxLength={60}
              autoFocus
              placeholder="30-day lock-in"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted">Start date</label>
              <input
                type="date"
                name="startDate"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-muted">End date</label>
              <input
                type="date"
                name="endDate"
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent [color-scheme:dark]"
              />
            </div>
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
              Start
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
