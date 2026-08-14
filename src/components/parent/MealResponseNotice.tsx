import { ClipboardCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { KidAvatar } from '../kid/KidAvatar';
import type { KidProfile, KidSelection, SelectionStatus } from '../../types';

interface MealResponseNoticeProps {
  profiles: KidProfile[];
  selections: KidSelection[];
  selectionStatus: SelectionStatus;
  onReviewChoices: () => void;
}

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

export function MealResponseNotice({
  profiles,
  selections,
  selectionStatus,
  onReviewChoices,
}: MealResponseNoticeProps) {
  if (selections.length === 0) return null;

  const respondingProfiles = selections
    .map((selection) => profiles.find((profile) => profile.id === selection.kidId))
    .filter((profile): profile is KidProfile => Boolean(profile));
  const names = respondingProfiles.map((profile) => profile.name);
  const nameList = names.length > 0 ? formatNames(names) : null;
  const isApproved = selectionStatus === 'approved';
  const actionLabel = isApproved ? 'View choices' : 'Review choices';
  const visibleProfiles = respondingProfiles.slice(0, 3);
  const remainingProfiles = respondingProfiles.length - visibleProfiles.length;

  return (
    <aside className="flex-shrink-0 border-b border-success/20 bg-success/10" aria-label="Meal choice responses">
      <div className="max-w-2xl mx-auto w-full flex items-center gap-3 px-4 py-3 md:px-6">
        {visibleProfiles.length > 0 ? (
          <div className="flex -space-x-2 flex-shrink-0" aria-label={`Responded: ${formatNames(names)}`}>
            {visibleProfiles.map((profile) => (
              <KidAvatar
                key={profile.id}
                name={profile.name}
                color={profile.avatarColor}
                avatarAnimal={profile.avatarAnimal}
                size="sm"
              />
            ))}
            {remainingProfiles > 0 && (
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-success text-xs font-bold text-white shadow-sm">
                +{remainingProfiles}
              </span>
            )}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
        )}

        <div className="min-w-0 flex-1" role="status" aria-live="polite">
          <p className="text-sm font-bold text-brand-ink font-heading">Orders are in!</p>
          <p className="text-xs text-gray-600 truncate">{nameList ?? 'Choices submitted'}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 whitespace-nowrap bg-white/70"
          onClick={onReviewChoices}
          aria-label={actionLabel}
        >
          <span className="hidden sm:inline">{actionLabel}</span>
          <span className="sm:hidden">{isApproved ? 'View' : 'Review'}</span>
        </Button>
      </div>
    </aside>
  );
}
