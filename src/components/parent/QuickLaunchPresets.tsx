import { Sunrise, Cookie, Moon, Sun, Play, Pencil } from 'lucide-react';
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
  onEdit: (slot: PresetSlot) => void;
}

export function QuickLaunchPresets({ onLaunch, onEdit }: QuickLaunchPresetsProps) {
  const { presets, presetsLoading } = useMenu();

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

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Launch</h2>
      <div className="grid grid-cols-2 gap-3">
        {PRESET_SLOTS.map((slot) => {
          const Icon = PRESET_ICONS[slot];
          const colors = PRESET_COLORS[slot];
          const preset = presets[slot];
          const isEmpty = !preset;
          const displayName = preset?.name || PRESET_CONFIG[slot].label;
          const groupCount = preset?.groups.length || 0;
          const itemCount = preset?.groups.reduce((acc, g) => acc + g.foodIds.length, 0) || 0;

          if (isEmpty) {
            return (
              <div
                key={slot}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200"
              >
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center opacity-50`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div className="flex-1 opacity-50">
                  <p className="text-sm font-medium text-gray-400">{PRESET_CONFIG[slot].label}</p>
                  <p className="text-xs text-gray-300">Not set up</p>
                </div>
                <button
                  onClick={() => onEdit(slot)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                  title="Set up menu"
                >
                  <Pencil className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={slot}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 ${colors.border} ${colors.bg}`}
            >
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{displayName}</p>
                <p className="text-xs text-gray-500">{groupCount} groups, {itemCount} items</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(slot)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/70 transition-colors"
                  title="Edit menu"
                >
                  <Pencil className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
                <button
                  onClick={() => onLaunch(slot)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/70 transition-colors"
                  title="Start meal"
                >
                  <Play className="w-4 h-4 text-gray-400 hover:text-parent-primary" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
