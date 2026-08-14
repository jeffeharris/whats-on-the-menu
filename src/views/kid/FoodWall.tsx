import { useMemo, useState } from 'react';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { AppShell } from '../../components/common/AppShell';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { computeFoodWall } from '../../utils/foodWallUtils';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodItem } from '../../types';

interface FoodWallProps {
  kidId: string;
  onBack: () => void;
  onSwitchKid: (kidId: string) => void;
}

// Deterministic scatter layout, tiled downward for however many foods a kid
// has — same trick FamilyStars uses for its star field so nothing jumps on
// re-render.
const STICKER_TILE = [
  { left: '-2%', top: 4, size: 108, tilt: -8 },
  { left: '33%', top: 34, size: 92, tilt: 6 },
  { left: '66%', top: 0, size: 104, tilt: 11 },
  { left: '6%', top: 122, size: 88, tilt: 14 },
  { left: '36%', top: 146, size: 100, tilt: -5 },
  { left: '70%', top: 128, size: 86, tilt: -12 },
  { left: '-4%', top: 256, size: 96, tilt: 9 },
  { left: '30%', top: 272, size: 84, tilt: -9 },
  { left: '62%', top: 250, size: 104, tilt: 4 },
  { left: '4%', top: 386, size: 92, tilt: -6 },
  { left: '38%', top: 408, size: 84, tilt: 13 },
  { left: '68%', top: 380, size: 96, tilt: -3 },
];
const TILE_HEIGHT = 500;

function TriedDotIcon({ tried }: { tried: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r={tried ? 7 : 2.6} fill="currentColor" />
    </svg>
  );
}

function describeFood(item: FoodItem, tried: boolean, servedCount: number, lastServedAt: number | null): string {
  const timesText = servedCount === 1 ? 'once' : `${servedCount} times`;
  if (tried) {
    const last = lastServedAt
      ? new Date(lastServedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    return last
      ? `You've had ${item.name.toLowerCase()} ${timesText}. Last time was ${last}.`
      : `You've had ${item.name.toLowerCase()} ${timesText}.`;
  }
  return `This has been on your plate ${timesText}. One little bite would put it on your wall!`;
}

export function FoodWall({ kidId, onBack, onSwitchKid }: FoodWallProps) {
  const { profiles, getProfile } = useKidProfiles();
  const { meals } = useMealHistory();
  const { getItem } = useFoodLibrary();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [openFoodId, setOpenFoodId] = useState<string | null>(null);

  const kid = getProfile(kidId);

  const stickers = useMemo(() => {
    return computeFoodWall(meals, kidId)
      .map((entry) => {
        const item = getItem(entry.foodId);
        return item ? { ...entry, item } : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [meals, kidId, getItem]);

  const rows = Math.max(1, Math.ceil(stickers.length / STICKER_TILE.length));
  const canvasHeight = rows * TILE_HEIGHT + 40;
  const selected = stickers.find((s) => s.foodId === openFoodId) ?? null;
  const canSwitchKid = profiles.length > 1;

  if (!kid) {
    return (
      <AppShell mode="kid" className="h-full flex flex-col items-center justify-center p-6 overflow-hidden">
        <p className="text-xl text-gray-600 mb-6">Hmm, we can't find that kid.</p>
        <Button mode="kid" variant="primary" size="touch" onClick={onBack}>
          Go back
        </Button>
      </AppShell>
    );
  }

  return (
    <AppShell mode="kid" className="h-full flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-3 p-4">
        <button
          onClick={onBack}
          className="ui-icon-button"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <KidAvatar
          name={kid.name}
          color={kid.avatarColor}
          avatarAnimal={kid.avatarAnimal}
          size="sm"
          onClick={canSwitchKid ? () => setShowSwitcher(true) : undefined}
          ariaLabel={canSwitchKid ? 'Switch kid' : undefined}
        />
        <h1 className="kid-hero-title text-2xl">{kid.name}'s foods</h1>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6">
        {stickers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-white/70 rounded-full flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-xl text-gray-600" style={{ fontFamily: 'var(--font-heading)' }}>
              Nothing here yet!
            </p>
            <p className="text-base text-gray-500 mt-2 max-w-xs">
              Foods show up here after {kid.name} has a meal to review.
            </p>
          </div>
        ) : (
          <>
            <div className="relative max-w-md mx-auto" style={{ height: canvasHeight }}>
              {stickers.map((sticker, i) => {
                const pos = STICKER_TILE[i % STICKER_TILE.length];
                const top = pos.top + Math.floor(i / STICKER_TILE.length) * TILE_HEIGHT;
                return (
                  <button
                    key={sticker.foodId}
                    onClick={() => setOpenFoodId(sticker.foodId)}
                    aria-label={sticker.item.name}
                    className="absolute p-0 border-0 bg-transparent cursor-pointer"
                    style={{ left: pos.left, top, width: pos.size, height: pos.size }}
                  >
                    <img
                      src={sticker.item.imageUrl || getPlaceholderImageUrl()}
                      alt=""
                      className="w-full h-full object-contain"
                      style={{
                        mixBlendMode: 'multiply',
                        transform: `rotate(${pos.tilt}deg)`,
                        opacity: sticker.tried ? 1 : 0.45,
                        filter: sticker.tried ? 'none' : 'saturate(0.25)',
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">Faded ones are still to try. Tap one!</p>
          </>
        )}
      </main>

      {/* Detail sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-brand-ink/30 backdrop-blur-[2px]"
          onClick={() => setOpenFoodId(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 pb-8 shadow-2xl fade-up-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <img
                src={selected.item.imageUrl || getPlaceholderImageUrl()}
                alt=""
                className="w-24 h-24 flex-shrink-0 object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-2xl font-bold text-brand-ink leading-tight text-pretty"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {selected.item.name}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                    selected.tried ? 'bg-brand-teal-deep/10 text-brand-teal-deep' : 'bg-gray-100 text-gray-500'
                  }`}
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  <TriedDotIcon tried={selected.tried} />
                  {selected.tried ? 'Tried it' : 'Not yet'}
                </span>
              </div>
            </div>
            <p className="mt-4 text-lg leading-relaxed text-gray-700">
              {describeFood(selected.item, selected.tried, selected.servedCount, selected.lastServedAt)}
            </p>
            <Button
              mode="kid"
              variant="primary"
              size="touch"
              fullWidth
              className="mt-5"
              onClick={() => setOpenFoodId(null)}
            >
              Okay!
            </Button>
          </div>
        </div>
      )}

      {/* Kid switcher */}
      <Modal isOpen={showSwitcher} onClose={() => setShowSwitcher(false)} mode="kid" title="Switch kid">
        <div className="grid grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setShowSwitcher(false);
                if (profile.id !== kidId) onSwitchKid(profile.id);
              }}
              className="flex flex-col items-center gap-2"
            >
              <KidAvatar
                name={profile.name}
                color={profile.avatarColor}
                avatarAnimal={profile.avatarAnimal}
                size="lg"
                selected={profile.id === kidId}
              />
              <span className="text-sm font-semibold text-gray-700 truncate max-w-full">{profile.name}</span>
            </button>
          ))}
        </div>
      </Modal>
    </AppShell>
  );
}
