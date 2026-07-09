"use client";

import { useState, useTransition } from "react";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions";
import { CATEGORY_PALETTE } from "@/lib/color";
import Modal from "./Modal";

export type CategoryRow = { id: string; name: string; color: string; goalCount: number };

function SwatchPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CATEGORY_PALETTE.map((swatch) => (
        <button
          key={swatch}
          type="button"
          onClick={() => onChange(swatch)}
          aria-label={`Use color ${swatch}`}
          className="h-6 w-6 rounded-full transition-transform"
          style={{
            backgroundColor: swatch,
            boxShadow: swatch === color ? `0 0 0 2px var(--surface), 0 0 0 4px ${swatch}` : "none",
          }}
        />
      ))}
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-6 cursor-pointer rounded-full border border-border bg-transparent"
        aria-label="Custom color"
      />
    </div>
  );
}

function CategoryRowItem({ category }: { category: CategoryRow }) {
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(category.color);
  const [, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="space-y-3 rounded-lg border border-accent/40 bg-background px-3 py-3">
        <form
          action={async (formData) => {
            await updateCategory(formData);
            setEditing(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="categoryId" value={category.id} />
          <input type="hidden" name="color" value={color} />
          <input
            name="name"
            required
            maxLength={30}
            defaultValue={category.name}
            autoFocus
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <SwatchPicker color={color} onChange={setColor} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
        <span className="text-sm">{category.name}</span>
        <span className="text-xs text-muted">
          {category.goalCount} goal{category.goalCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted hover:text-foreground"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={category.goalCount > 0}
          onClick={() => startTransition(() => deleteCategory(category.id))}
          title={category.goalCount > 0 ? "Reassign or remove its goals first" : "Delete"}
          className="text-xs text-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function CategoryManagerModal({ categories }: { categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(CATEGORY_PALETTE[0]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        Manage categories
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Categories">
        <ul className="mt-4 space-y-2">
          {categories.map((c) => (
            <CategoryRowItem key={c.id} category={c} />
          ))}
        </ul>

        <form
          action={async (formData) => {
            await createCategory(formData);
            setColor(CATEGORY_PALETTE[0]);
          }}
          className="mt-5 space-y-3 border-t border-border pt-4"
        >
          <label className="text-xs text-muted">New category</label>
          <input
            name="name"
            required
            maxLength={30}
            placeholder="e.g. Work"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input type="hidden" name="color" value={color} />
          <SwatchPicker color={color} onChange={setColor} />
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Add category
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
