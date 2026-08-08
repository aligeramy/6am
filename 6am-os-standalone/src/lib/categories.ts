import { BudgetItem } from "../types/os";

// Chip styling per release category; custom categories fall back to slate.
const CATEGORY_CHIP: Record<string, string> = {
  "Main Release": "bg-violet-500/20 text-violet-300",
  "Side Release": "bg-cyan-500/20 text-cyan-300",
  "Brand Release": "bg-amber-500/20 text-amber-300",
};

const CATEGORY_DOT: Record<string, string> = {
  "Main Release": "bg-violet-400",
  "Side Release": "bg-cyan-400",
  "Brand Release": "bg-amber-400",
};

export function categoryChip(itemType?: string) {
  return CATEGORY_CHIP[itemType ?? ""] ?? "bg-slate-500/20 text-slate-300";
}

export function categoryDot(itemType?: string) {
  return CATEGORY_DOT[itemType ?? ""] ?? "bg-slate-400";
}

export function parseTags(input: string): string[] {
  return [
    ...new Set(
      (input.match(/#?[\w-]+/g) ?? [])
        .map((t) => t.replace(/^#/, "").toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function tagsToInput(tags?: string[]) {
  return (tags ?? []).map((t) => `#${t}`).join(" ");
}

export function investedForTags(budgetItems: BudgetItem[], tags?: string[]): number {
  if (!tags || tags.length === 0) return 0;
  const set = new Set(tags);
  return budgetItems
    .filter((b) => (b.tags ?? []).some((t) => set.has(t)))
    .reduce((sum, b) => sum + b.amount, 0);
}

export function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
