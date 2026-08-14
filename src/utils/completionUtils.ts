import type { CompletionStatus, KidSelection } from '../types';

/** Get all food IDs from a selection (handles both old and new group format) */
export function getAllFoodIds(selection: KidSelection): string[] {
  const ids: string[] = [];
  if (selection.selections) {
    Object.values(selection.selections).forEach((groupIds) => {
      ids.push(...groupIds);
    });
  } else {
    if (selection.mainId) ids.push(selection.mainId);
    if (selection.sideIds) ids.push(...selection.sideIds);
  }
  return ids;
}

export interface CompletionStep {
  value: NonNullable<CompletionStatus>;
  label: string;
  shortLabel: string;
  /** How "full" the step's dot icon renders, 0 (empty) to 1 (full). */
  fill: number;
  solidClass: string;
  tintClass: string;
  tintBorderClass: string;
  inkClass: string;
}

/** The four completion steps a food can be marked, in cycle order. */
export const COMPLETION_STEPS: CompletionStep[] = [
  {
    value: 'none',
    label: "Didn't try",
    shortLabel: 'None',
    fill: 0,
    solidClass: 'bg-gray-400',
    tintClass: 'bg-gray-100',
    tintBorderClass: 'border-gray-200',
    inkClass: 'text-gray-600',
  },
  {
    value: 'tried',
    label: 'Tried it',
    shortLabel: 'Tried',
    fill: 0.26,
    solidClass: 'bg-parent-primary-deep',
    tintClass: 'bg-parent-primary-deep/12',
    tintBorderClass: 'border-parent-primary-deep/25',
    inkClass: 'text-parent-primary-deep',
  },
  {
    value: 'some',
    label: 'Some',
    shortLabel: 'Some',
    fill: 0.6,
    solidClass: 'bg-warning',
    tintClass: 'bg-warning/10',
    tintBorderClass: 'border-warning/20',
    inkClass: 'text-warning',
  },
  {
    value: 'all',
    label: 'All of it',
    shortLabel: 'All',
    fill: 1,
    solidClass: 'bg-success',
    tintClass: 'bg-success/10',
    tintBorderClass: 'border-success/20',
    inkClass: 'text-success',
  },
];

export function getCompletionStep(status: CompletionStatus): CompletionStep | undefined {
  return COMPLETION_STEPS.find((step) => step.value === status);
}

/** Get the card background/border classes for a given completion status */
export function getCompletionCardColor(status: CompletionStatus): string {
  const step = getCompletionStep(status);
  if (!step) return 'bg-gray-50 border border-transparent';
  return `${step.tintClass} border ${step.tintBorderClass}`;
}

export interface KidReviewSummary {
  markedCount: number;
  totalCount: number;
  /** Every food marked "All of it" — the original Happy Plate condition. */
  cleared: boolean;
  /** Every food marked something other than "Didn't try", but not fully cleared. */
  triedEverything: boolean;
  summaryText: string;
}

/** Summarize a kid's in-progress review for the collapsed header line and badges. */
export function summarizeKidReview(
  completions: { [foodId: string]: CompletionStatus },
  foodIds: string[]
): KidReviewSummary {
  const vals = foodIds.map((id) => completions[id] ?? null);
  const markedCount = vals.filter(Boolean).length;
  const totalCount = vals.length;
  const cleared = totalCount > 0 && vals.every((v) => v === 'all');
  const triedEverything = !cleared && totalCount > 0 && vals.every((v) => v !== null && v !== 'none');
  const eatenCount = vals.filter((v) => v === 'all' || v === 'some').length;

  const summaryText = cleared
    ? 'Cleared the plate'
    : markedCount === totalCount
      ? `${eatenCount} of ${totalCount} eaten`
      : `${markedCount} of ${totalCount} marked`;

  return { markedCount, totalCount, cleared, triedEverything, summaryText };
}
