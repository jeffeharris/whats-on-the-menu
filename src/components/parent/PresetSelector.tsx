import { useState, useRef, useEffect } from 'react';
import { Sunrise, Cookie, Moon, Sun, MoreVertical, Copy, Trash2, Check, X, Plus } from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useMenu } from '../../contexts/MenuContext';
import type { PresetSlot } from '../../types';
import { PRESET_CONFIG } from '../../types';

const PRESET_ICONS: Record<PresetSlot, React.ElementType> = {
  breakfast: Sunrise,
  snack: Cookie,
  dinner: Moon,
  custom: Sun,
};

const PRESET_SLOTS: PresetSlot[] = ['breakfast', 'snack', 'dinner', 'custom'];

interface PresetSelectorProps {
  onScratchClick: () => void;
}

export function PresetSelector({ onScratchClick }: PresetSelectorProps) {
  const { presets, currentPresetSlot, loadPreset, clearPreset, copyPreset, renamePreset } = useMenu();
  const [editingSlot, setEditingSlot] = useState<PresetSlot | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSlot && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSlot]);

  const handleStartEdit = (slot: PresetSlot) => {
    const preset = presets[slot];
    setEditingSlot(slot);
    setEditingName(preset?.name || PRESET_CONFIG[slot].label);
  };

  const handleSaveRename = async () => {
    if (editingSlot && editingName.trim()) {
      await renamePreset(editingSlot, editingName.trim());
    }
    setEditingSlot(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingSlot(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCopy = async (fromSlot: PresetSlot, toSlot: PresetSlot) => {
    await copyPreset(fromSlot, toSlot);
  };

  const handleClear = async (slot: PresetSlot) => {
    if (confirm(`Clear the ${PRESET_CONFIG[slot].label} preset?`)) {
      await clearPreset(slot);
    }
  };

  return (
    <div className="mb-6">
      {/* Preset tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {PRESET_SLOTS.map((slot) => {
          const Icon = PRESET_ICONS[slot];
          const preset = presets[slot];
          const isActive = currentPresetSlot === slot;
          const displayName = preset?.name || PRESET_CONFIG[slot].label;
          const isEmpty = !preset;
          const groupCount = preset?.groups.reduce((acc, g) => acc + g.foodIds.length, 0) || 0;

          return (
            <div
              key={slot}
              className={`
                flex-shrink-0 relative group rounded-lg border-2 transition-all
                ${isActive
                  ? 'border-parent-primary bg-parent-primary/5'
                  : isEmpty
                    ? 'border-dashed border-gray-300 hover:border-gray-400'
                    : 'border-gray-200 hover:border-parent-primary/50'
                }
              `}
            >
              <button
                onClick={() => loadPreset(slot)}
                className="flex items-center gap-2 px-3 py-2 min-w-[120px]"
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? 'text-parent-primary' : 'text-gray-500'}`}
                />
                <div className="flex flex-col items-start">
                  {editingSlot === slot ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSaveRename}
                        className="w-20 px-1 text-sm font-medium border border-parent-primary rounded focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRename();
                        }}
                        className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`text-sm font-medium ${isActive ? 'text-parent-primary' : 'text-gray-700'}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (preset) handleStartEdit(slot);
                        }}
                      >
                        {displayName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {isEmpty ? 'Empty' : `${groupCount} items`}
                      </span>
                    </>
                  )}
                </div>
              </button>

              {/* Dropdown menu */}
              {preset && editingSlot !== slot && (
                <Menu as="div" className="absolute top-1 right-1">
                  <MenuButton
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </MenuButton>
                  <MenuItems className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <MenuItem>
                      {({ focus }) => (
                        <button
                          onClick={() => handleStartEdit(slot)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${focus ? 'bg-gray-50' : ''}`}
                        >
                          Rename
                        </button>
                      )}
                    </MenuItem>
                    <Menu as="div" className="relative">
                      <MenuButton
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50"
                      >
                        <Copy className="w-4 h-4" />
                        Copy to...
                      </MenuButton>
                      <MenuItems className="absolute left-full top-0 ml-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                        {PRESET_SLOTS.filter((s) => s !== slot).map((targetSlot) => {
                          const TargetIcon = PRESET_ICONS[targetSlot];
                          return (
                            <MenuItem key={targetSlot}>
                              {({ focus }) => (
                                <button
                                  onClick={() => handleCopy(slot, targetSlot)}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${focus ? 'bg-gray-50' : ''}`}
                                >
                                  <TargetIcon className="w-4 h-4" />
                                  {PRESET_CONFIG[targetSlot].label}
                                </button>
                              )}
                            </MenuItem>
                          );
                        })}
                      </MenuItems>
                    </Menu>
                    <MenuItem>
                      {({ focus }) => (
                        <button
                          onClick={() => handleClear(slot)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 ${focus ? 'bg-red-50' : ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear
                        </button>
                      )}
                    </MenuItem>
                  </MenuItems>
                </Menu>
              )}
            </div>
          );
        })}

        {/* Scratch button */}
        <button
          onClick={onScratchClick}
          className={`
            flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all min-w-[120px]
            ${currentPresetSlot === null
              ? 'border-parent-primary bg-parent-primary/5'
              : 'border-gray-200 hover:border-parent-primary/50'
            }
          `}
        >
          <Plus className={`w-5 h-5 ${currentPresetSlot === null ? 'text-parent-primary' : 'text-gray-500'}`} />
          <div className="flex flex-col items-start">
            <span className={`text-sm font-medium ${currentPresetSlot === null ? 'text-parent-primary' : 'text-gray-700'}`}>
              From Scratch
            </span>
            <span className="text-xs text-gray-400">One-time menu</span>
          </div>
        </button>
      </div>

      {/* Mode indicator */}
      {currentPresetSlot && (
        <div className="mt-2 text-sm text-gray-500">
          Editing <span className="font-medium text-parent-primary">{presets[currentPresetSlot]?.name || PRESET_CONFIG[currentPresetSlot].label}</span> preset
        </div>
      )}
    </div>
  );
}
