export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Curated to stay visually distinct from the teal accent and legible on a
// dark background — offered as swatches when creating a category.
export const CATEGORY_PALETTE = [
  "#fb5d3e", // orange-red
  "#f59e0b", // amber
  "#facc15", // yellow
  "#60a5fa", // blue
  "#818cf8", // indigo
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fb7185", // rose
  "#94b3ac", // slate
  "#eab308", // gold
];
