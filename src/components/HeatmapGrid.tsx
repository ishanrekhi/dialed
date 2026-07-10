"use client";

import { useState } from "react";
import { hexToRgba } from "@/lib/color";
import { todayKey } from "@/lib/dates";
import DayDetailPanel from "./DayDetailPanel";
import type { HeatmapDay, MonthLabel } from "@/lib/heatmap";

const ACCENT = "#00e6c3";
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const LEGEND_STEPS = [0, 0.2, 0.5, 0.8, 1];

function levelColor(ratio: number): string {
  if (ratio <= 0) return "var(--border)";
  if (ratio < 0.34) return hexToRgba(ACCENT, 0.3);
  if (ratio < 0.67) return hexToRgba(ACCENT, 0.55);
  if (ratio < 1) return hexToRgba(ACCENT, 0.8);
  return ACCENT;
}

export default function HeatmapGrid({
  weeksGrid,
  monthLabels,
  streakDates,
}: {
  weeksGrid: HeatmapDay[][];
  monthLabels: MonthLabel[];
  streakDates: string[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const monthByWeek = new Map(monthLabels.map((m) => [m.weekIndex, m.label]));
  const streakSet = new Set(streakDates);
  const today = todayKey();

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4">
        <div className="inline-flex flex-col gap-1.5">
          <div className="flex gap-[3px] pl-6">
            {weeksGrid.map((_, wi) => (
              <div key={wi} className="w-[11px] shrink-0 text-[10px] leading-none text-muted">
                {monthByWeek.get(wi) ?? ""}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[11px] w-5 items-center text-[10px] leading-none text-muted"
                >
                  {label}
                </div>
              ))}
            </div>
            {weeksGrid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => {
                  const isFuture = day.date > today;
                  const inStreak = streakSet.has(day.date);
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDate(day.date)}
                      title={
                        isFuture
                          ? day.date
                          : `${day.date} — ${Math.round(day.ratio * 100)}% of goals done`
                      }
                      className="h-[11px] w-[11px] shrink-0 rounded-[3px] transition-transform enabled:hover:scale-125 disabled:cursor-default"
                      style={{
                        backgroundColor: isFuture ? "transparent" : levelColor(day.ratio),
                        boxShadow: inStreak ? `0 0 0 1.5px ${ACCENT}` : "none",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-6 pt-1 text-[10px] text-muted">
            <span>Less</span>
            {LEGEND_STEPS.map((r) => (
              <div
                key={r}
                className="h-[11px] w-[11px] rounded-[3px]"
                style={{ backgroundColor: levelColor(r) }}
              />
            ))}
            <span>More</span>
            {streakSet.size > 0 && (
              <span className="ml-3 flex items-center gap-1.5">
                <span
                  className="h-[11px] w-[11px] rounded-[3px]"
                  style={{ backgroundColor: levelColor(1), boxShadow: `0 0 0 1.5px ${ACCENT}` }}
                />
                current streak
              </span>
            )}
          </div>
        </div>
      </div>

      <DayDetailPanel date={selectedDate} onClose={() => setSelectedDate(null)} />
    </>
  );
}
