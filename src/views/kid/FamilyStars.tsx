import { ChevronLeft } from 'lucide-react';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';

interface FamilyStarsProps {
  onBack: () => void;
}

// Deterministic pseudo-random positions so stars don't jump on re-render
const STAR_POSITIONS = [
  { top: '8%', left: '15%', size: 56, rotate: 12 },
  { top: '12%', left: '72%', size: 48, rotate: -20 },
  { top: '25%', left: '45%', size: 64, rotate: 5 },
  { top: '18%', left: '28%', size: 40, rotate: 30 },
  { top: '6%', left: '55%', size: 52, rotate: -10 },
  { top: '30%', left: '80%', size: 44, rotate: 18 },
  { top: '22%', left: '10%', size: 50, rotate: -25 },
  { top: '15%', left: '88%', size: 42, rotate: 8 },
  { top: '32%', left: '35%', size: 46, rotate: -15 },
  { top: '10%', left: '40%', size: 54, rotate: 22 },
];

const STAR_PATH = 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z';

export function FamilyStars({ onBack }: FamilyStarsProps) {
  const { profiles } = useKidProfiles();
  const { getStarCountForKid, getTotalFamilyStars } = useMealHistory();
  const totalStars = getTotalFamilyStars();

  return (
    <div className="h-full bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-950 flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full relative z-10">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6 text-white/80" />
        </button>
        <h1 className="text-2xl font-bold text-white font-heading">Our Stars</h1>
      </header>

      {/* Scattered stars in the sky */}
      {Array.from({ length: totalStars }).map((_, i) => {
        const pos = STAR_POSITIONS[i % STAR_POSITIONS.length];
        return (
          <svg
            key={i}
            className="absolute text-yellow-300 animate-pulse drop-shadow-[0_0_12px_rgba(253,224,71,0.6)]"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.size,
              height: pos.size,
              transform: `rotate(${pos.rotate}deg)`,
              animationDelay: `${i * 300}ms`,
              animationDuration: `${2 + (i % 3) * 0.5}s`,
            }}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d={STAR_PATH} />
          </svg>
        );
      })}

      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-end pb-12 p-6 relative z-10">
        {/* Label */}
        <span className="text-xl text-white/70 mb-8">
          {totalStars === 1 ? '1 Happy Plate Star' : `${totalStars} Happy Plate Stars`}
        </span>

        {/* Per-kid breakdown */}
        <div className="w-full max-w-md">
          <div className="grid grid-cols-2 gap-6">
            {profiles.map((profile) => {
              const starCount = getStarCountForKid(profile.id);
              return (
                <div key={profile.id} className="flex flex-col items-center bg-white/10 rounded-2xl p-4">
                  <KidAvatar name={profile.name} color={profile.avatarColor} avatarAnimal={profile.avatarAnimal} size="lg" />
                  <span className="mt-2 text-lg font-semibold text-white">{profile.name}</span>
                  <div className="flex items-center justify-center flex-wrap gap-0.5 mt-1">
                    {starCount > 0 ? (
                      Array.from({ length: starCount }).map((_, i) => (
                        <svg key={i} className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                          <path d={STAR_PATH} />
                        </svg>
                      ))
                    ) : (
                      <span className="text-sm text-white/40">No stars yet</span>
                    )}
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
