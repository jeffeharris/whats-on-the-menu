import type { CompletionStatus } from '../../types';

/** Get the card background color for a given completion status */
export function getCompletionCardColor(status: CompletionStatus): string {
  switch (status) {
    case 'all': return 'bg-success/10 border border-success/20';
    case 'some': return 'bg-warning/10 border border-warning/20';
    case 'none': return 'bg-gray-100 border border-gray-200';
    default: return 'bg-gray-50 border border-transparent';
  }
}
