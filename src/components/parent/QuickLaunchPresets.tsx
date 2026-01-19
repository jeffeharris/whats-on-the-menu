import { Sunrise, Cookie, Moon, Sun, Play } from 'lucide-react';
import { useMenu } from '../../contexts/MenuContext';
import type { PresetSlot } from '../../types';
import { PRESET_CONFIG } from '../../types';

const PRESET_ICONS: Record<PresetSlot, React.ElementType> = {
  breakfast: Sunrise,
  snack: Cookie,
  dinner: Moon,
  custom: Sun,
};

const PRESET_COLORS: Record<PresetSlot, { bg: string; icon: string; border: string }> = {
  breakfast: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-200' },
  snack: { bg: 'bg-orange-50', icon: 'text-orange-500', border: 'border-orange-200' },
  dinner: { bg: 'bg-indigo-50', icon: 'text-indigo-500', border: 'border-indigo-200' },
  custom: { bg: 'bg-yellow-50', icon: 'text-yellow-500', border: 'border-yellow-200' },
};

const PRESET_SLOTS: PresetSlot[] = ['breakfast', 'snack', 'dinner', 'custom'];

interface QuickLaunchPresetsProps {
  onLaunch: (slot: PresetSlot) => void;
}

export function QuickLaunchPresets({ onLaunch }: QuickLaunchPresetsProps) {
  const { presets, presetsLoading } = useMenu();

  // Check if any presets exist
  const hasAnyPresets = PRESET_SLOTS.some((slot) => presets[slot] !== null);

  if (presetsLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Launch</h2>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAnyPresets) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Launch</h2>
      <div className="grid grid-cols-2 gap-3">
        {PRESET_SLOTS.map((slot) => {
          const Icon = PRESET_ICONS[slot];
          const colors = PRESET_COLORS[slot];
          const preset = presets[slot];
          const displayName = preset?.name || PRESET_CONFIG[slot].label;
          const isEmpty = !preset;
          const groupCount = preset?.groups.length || 0;
          const itemCount = preset?.groups.reduce((acc, g) => acc + g.foodIds.length, 0) || 0;

          if (isEmpty) {
            return (
              <div
                key={slot}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 opacity-50"
              >
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-400">{PRESET_CONFIG[slot].label}</p>
                  <p className="text-xs text-gray-300">Not set up</p>
                </div>
              </div>
            );
          }

          return (
            <button
              key={slot}
              onClick={() => onLaunch(slot)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 ${colors.border} ${colors.bg} hover:shadow-md transition-all group`}
            >
              <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-700">{displayName}</p>
                <p className="text-xs text-gray-500">{groupCount} groups, {itemCount} items</p>
              </div>
              <Play className="w-5 h-5 text-gray-400 group-hover:text-parent-primary transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
