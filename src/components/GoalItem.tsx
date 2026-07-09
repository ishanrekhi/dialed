"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { hexToRgba } from "@/lib/color";
import EditGoalModal from "./EditGoalModal";
import type { Recurrence } from "@prisma/client";

const ACCENT_COLOR = "#00e6c3";

export type GoalRow = {
  id: string;
  title: string;
  category: { id: string; name: string; color: string };
  recurrence: Recurrence;
  specificDate: Date | null;
};

export default function GoalItem({
  goal,
  completed,
  onToggle,
  categories,
}: {
  goal: GoalRow;
  completed: boolean;
  onToggle: () => void;
  categories: { id: string; name: string }[];
}) {
  const color = goal.category.color;
  const checkboxRef = useRef<HTMLSpanElement>(null);
  const [editOpen, setEditOpen] = useState(false);

  function handleClick() {
    if (!completed && checkboxRef.current) {
      const rect = checkboxRef.current.getBoundingClientRect();
      confetti({
        particleCount: 22,
        spread: 55,
        startVelocity: 28,
        scalar: 0.75,
        gravity: 1.2,
        ticks: 55,
        colors: [color, ACCENT_COLOR],
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
    }
    onToggle();
  }

  return (
    <li>
      <motion.div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        whileTap={{ scale: 0.98 }}
        animate={{
          borderColor: completed ? color : "var(--border)",
          boxShadow: completed
            ? `0 0 0 1px ${color}, 0 0 20px -6px ${color}`
            : "0 0 0 0px transparent",
        }}
        transition={{ duration: 0.2 }}
        className="group relative flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 bg-surface px-4 py-4 text-left transition-colors hover:bg-surface-hover"
      >
        <motion.span
          ref={checkboxRef}
          initial={false}
          animate={{
            backgroundColor: completed ? color : "rgba(0,0,0,0)",
            borderColor: completed ? color : "var(--border)",
            scale: completed ? [1, 1.35, 1] : 1,
          }}
          transition={{ duration: 0.35, times: [0, 0.4, 1], ease: "easeOut" }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2"
        >
          {completed && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              viewBox="0 0 12 10"
              className="h-4 w-4"
            >
              <path
                d="M1 5L4.5 8.5L11 1"
                fill="none"
                stroke="#03211c"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </motion.span>
        <span
          className={`flex-1 text-[15px] font-medium ${completed ? "text-muted line-through decoration-2" : "text-foreground"}`}
        >
          {goal.title}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ color, backgroundColor: hexToRgba(color, 0.16) }}
        >
          {goal.category.name}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditOpen(true);
          }}
          aria-label="Edit goal"
          className="shrink-0 rounded-full p-1.5 text-muted opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
            <path
              d="M11.3 2.3a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-7 7-3 .7.7-3 7-7Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </motion.div>

      <EditGoalModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        goal={{
          id: goal.id,
          title: goal.title,
          categoryId: goal.category.id,
          recurrence: goal.recurrence,
          specificDate: goal.specificDate,
        }}
        categories={categories}
      />
    </li>
  );
}
