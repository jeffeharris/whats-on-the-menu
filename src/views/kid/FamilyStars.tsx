import { KidAvatar } from '../../components/kid/KidAvatar';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';

interface FamilyStarsProps {
  onBack: () => void;
}

export function FamilyStars({ onBack }: FamilyStarsProps) {
  const { profiles } = useKidProfiles();
  const { getStarCountForKid, getTotalFamilyStars } = useMealHistory();
  const totalStars = getTotalFamilyStars();

  return (
    <div className="h-full bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white">Our Stars</h1>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        {/* Large star with total count */}
        <div className="flex flex-col items-center mb-12">
          <svg
            className="w-24 h-24 text-yellow-300 animate-pulse"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <span className="text-6xl font-bold text-white mt-4">{totalStars}</span>
          <span className="text-xl text-white/70 mt-2">
            {totalStars === 1 ? 'Happy Plate Star' : 'Happy Plate Stars'}
          </span>
        </div>

        {/* Per-kid breakdown */}
        <div className="w-full max-w-md">
          <div className="grid grid-cols-2 gap-6">
            {profiles.map((profile) => {
              const starCount = getStarCountForKid(profile.id);
              return (
                <div key={profile.id} className="flex flex-col items-center bg-white/10 rounded-2xl p-4">
                  <KidAvatar name={profile.name} color={profile.avatarColor} size="lg" />
                  <span className="mt-2 text-lg font-semibold text-white">{profile.name}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                    <span className="text-xl font-bold text-yellow-300">{starCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
