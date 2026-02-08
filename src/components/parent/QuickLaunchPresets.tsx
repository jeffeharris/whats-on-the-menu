import { Sunrise, Cookie, Moon, Sun, Play, Pencil, Plus, ChevronRight } from 'lucide-react';
import { useMenu } from '../../contexts/MenuContext';
import type { PresetSlot } from '../../types';
import { PRESET_CONFIG } from '../../types';

const PRESET_ICONS: Record<PresetSlot, React.ElementType> = {
  breakfast: Sunrise,
  snack: Cookie,
  dinner: Moon,
  custom: Sun,
};

const PRESET_COLORS: Record<PresetSlot, {
  bg: string;
  icon: string;
  border: string;
  accent: string;
  accentHover: string;
  gradient: string;
  groupHoverIcon: string;
}> = {
  breakfast: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    border: 'border-amber-200/80',
    accent: 'bg-amber-500',
    accentHover: 'hover:bg-amber-600',
    gradient: 'bg-gradient-to-r from-amber-50/60 to-transparent',
    groupHoverIcon: 'group-hover:text-amber-500',
  },
  snack: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'border-orange-200/80',
    accent: 'bg-orange-500',
    accentHover: 'hover:bg-orange-600',
    gradient: 'bg-gradient-to-r from-orange-50/60 to-transparent',
    groupHoverIcon: 'group-hover:text-orange-500',
  },
  dinner: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    border: 'border-indigo-200/80',
    accent: 'bg-indigo-500',
    accentHover: 'hover:bg-indigo-600',
    gradient: 'bg-gradient-to-r from-indigo-50/60 to-transparent',
    groupHoverIcon: 'group-hover:text-indigo-500',
  },
  custom: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    border: 'border-yellow-200/80',
    accent: 'bg-yellow-500',
    accentHover: 'hover:bg-yellow-600',
    gradient: 'bg-gradient-to-r from-yellow-50/60 to-transparent',
    groupHoverIcon: 'group-hover:text-yellow-500',
  },
};

const PRESET_SLOTS: PresetSlot[] = ['breakfast', 'snack', 'dinner', 'custom'];

interface QuickLaunchPresetsProps {
  onLaunch: (slot: PresetSlot) => void;
  onEdit: (slot: PresetSlot) => void;
}

export function QuickLaunchPresets({ onLaunch, onEdit }: QuickLaunchPresetsProps) {
  const { presets, presetsLoading } = useMenu();

  if (presetsLoading) {
    return (
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
            Quick Launch
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
        </div>
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[68px] bg-gray-100 rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
          Quick Launch
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
      </div>
      <div className="flex flex-col gap-2.5">
        {PRESET_SLOTS.map((slot, index) => {
          const Icon = PRESET_ICONS[slot];
          const colors = PRESET_COLORS[slot];
          const preset = presets[slot];
          const isEmpty = !preset;
          const displayName = preset?.name || PRESET_CONFIG[slot].label;
          const groupCount = preset?.groups.length || 0;
          const itemCount = preset?.groups.reduce((acc, g) => acc + g.foodIds.length, 0) || 0;

          if (isEmpty) {
            return (
              <button
                key={slot}
                onClick={() => onEdit(slot)}
                className={`
                  flex items-center gap-3 p-3 pr-4 rounded-xl border border-gray-200
                  ${colors.gradient}
                  card-pop-in transition-all duration-150
                  hover:border-gray-300 hover:shadow-sm active:scale-[0.98]
                  group text-left
                `}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={`w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0
                                border border-dashed border-gray-300 group-hover:border-gray-400 transition-colors`}>
                  <Plus className={`w-5 h-5 text-gray-400 ${colors.groupHoverIcon} transition-colors`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors"
                     style={{ fontFamily: 'var(--font-heading)' }}>
                    {PRESET_CONFIG[slot].label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Tap to set up</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
              </button>
            );
          }

          return (
            <div
              key={slot}
              className={`
                flex items-center gap-3 p-3 pr-2.5 rounded-xl border ${colors.border} ${colors.bg}
                card-pop-in transition-all duration-150
              `}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {groupCount} {groupCount === 1 ? 'group' : 'groups'} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onEdit(slot)}
                  className="w-11 h-11 flex items-center justify-center rounded-xl
                             text-gray-400 hover:text-gray-600 hover:bg-white/70
                             transition-all duration-150 active:scale-95"
                  title="Edit menu"
                  aria-label={`Edit ${displayName}`}
                >
                  <Pencil className="w-[18px] h-[18px]" />
                </button>
                <button
                  onClick={() => onLaunch(slot)}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl
                              ${colors.accent} ${colors.accentHover} text-white shadow-sm
                              transition-all duration-150 hover:scale-105 hover:shadow-md active:scale-95`}
                  title="Start meal"
                  aria-label={`Launch ${displayName}`}
                >
                  <Play className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
