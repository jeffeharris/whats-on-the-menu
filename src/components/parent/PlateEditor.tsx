import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import {
  ADD_ONS_GROUP_ID,
  SELECTION_PRESET_CONFIG,
  isAddOnsGroup,
} from '../../types';
import type { GroupSelections, KidProfile, Menu, MenuGroup } from '../../types';

// How many library items to offer at once; the search box reaches the rest.
const ADD_ON_SUGGESTIONS = 24;

interface PlateEditorProps {
  kid: KidProfile;
  menu: Menu;
  selections: GroupSelections;
  saving: boolean;
  onCancel: () => void;
  onSave: (next: GroupSelections) => void;
}

/**
 * A grown-up changing a plate a kid already submitted.
 *
 * Every group is a plain multi-select: untoggle to drop an item, toggle to add
 * one, and a swap is just those two together. That makes substitution fall out
 * of the same interaction as everything else rather than needing a flow of its
 * own.
 *
 * The pick-N rules the kid was held to still apply to the menu's own groups --
 * a plate has to stay a valid plate. Anything beyond them belongs in add-ons,
 * which draws on the whole food library and takes any number of items.
 */
export function PlateEditor({
  kid,
  menu,
  selections,
  saving,
  onCancel,
  onSave,
}: PlateEditorProps) {
  const { getItem } = useFoodLibrary();
  const [draft, setDraft] = useState<GroupSelections>(selections);
  const [addOnQuery, setAddOnQuery] = useState('');

  const groups = useMemo(
    () => [...menu.groups].sort((a, b) => a.order - b.order),
    [menu.groups],
  );

  // A food may live in only one group at a time, so a toggle has to know what
  // every other group already holds.
  const selectedElsewhere = (groupId: string, foodId: string) =>
    Object.entries(draft).some(
      ([otherId, foodIds]) => otherId !== groupId && foodIds.includes(foodId),
    );

  const toggle = (group: MenuGroup, foodId: string) => {
    const current = draft[group.id] ?? [];
    const isOn = current.includes(foodId);
    const { max } = SELECTION_PRESET_CONFIG[group.selectionPreset];

    if (!isOn && selectedElsewhere(group.id, foodId)) return;

    let next: string[];
    if (isOn) {
      next = current.filter((id) => id !== foodId);
    } else if (current.length >= max) {
      // At the ceiling a tap reads as "I meant this one instead" -- replacing
      // the oldest pick beats refusing the tap with no explanation.
      next = [...current.slice(1), foodId];
    } else {
      next = [...current, foodId];
    }

    setDraft((prev) => ({ ...prev, [group.id]: next }));
  };

  const violations = groups
    .map((group) => {
      const count = (draft[group.id] ?? []).length;
      const { min, max } = SELECTION_PRESET_CONFIG[group.selectionPreset];
      if (count >= min && count <= max) return null;
      return min === max
        ? `${group.label} needs exactly ${min}`
        : `${group.label} needs ${min}–${max}`;
    })
    .filter((message): message is string => message !== null);

  const addOnsGroup = groups.find(isAddOnsGroup);
  const chosenAddOns = draft[ADD_ONS_GROUP_ID] ?? [];
  const addOnQueryText = addOnQuery.trim().toLowerCase();
  const addOnCandidates = (addOnsGroup?.foodIds ?? [])
    .map((foodId) => ({ foodId, item: getItem(foodId) }))
    .filter((entry) => entry.item !== undefined)
    .filter((entry) => !chosenAddOns.includes(entry.foodId))
    .filter((entry) => !selectedElsewhere(ADD_ONS_GROUP_ID, entry.foodId))
    .filter((entry) => !addOnQueryText || entry.item!.name.toLowerCase().includes(addOnQueryText))
    .slice(0, ADD_ON_SUGGESTIONS);

  return (
    <Modal isOpen onClose={onCancel} title={`Edit ${kid.name}'s plate`}>
      <div className="space-y-6">
        {groups.filter((group) => !isAddOnsGroup(group)).map((group) => {
          const chosen = draft[group.id] ?? [];
          const { label: presetLabel } = SELECTION_PRESET_CONFIG[group.selectionPreset];

          return (
            <section key={group.id}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                  {group.label}
                </h3>
                <span className="text-xs text-gray-400">{presetLabel}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.foodIds.map((foodId) => {
                  const item = getItem(foodId);
                  if (!item) return null;
                  const isOn = chosen.includes(foodId);
                  const blocked = !isOn && selectedElsewhere(group.id, foodId);

                  return (
                    <button
                      key={foodId}
                      type="button"
                      disabled={blocked}
                      onClick={() => toggle(group, foodId)}
                      aria-pressed={isOn}
                      className={`flex items-center gap-2 rounded-xl p-2 text-left transition-colors border-2 ${
                        isOn
                          ? 'border-parent-primary bg-parent-primary/10'
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      } ${blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <img
                        src={item.imageUrl || getPlaceholderImageUrl()}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover bg-gray-200 flex-shrink-0"
                      />
                      <span className="font-medium text-gray-800 text-sm truncate flex-1">
                        {item.name}
                      </span>
                      {isOn && <Check className="w-4 h-4 text-parent-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {addOnsGroup && (
          <section>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
              Added by a grown-up
            </h3>

            {chosenAddOns.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {chosenAddOns.map((foodId) => {
                  const item = getItem(foodId);
                  return (
                    <button
                      key={foodId}
                      type="button"
                      onClick={() => toggle(addOnsGroup, foodId)}
                      aria-pressed
                      className="flex items-center gap-2 rounded-xl p-2 text-left border-2 border-parent-primary bg-parent-primary/10"
                    >
                      <img
                        src={item?.imageUrl || getPlaceholderImageUrl()}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover bg-gray-200 flex-shrink-0"
                      />
                      <span className="font-medium text-gray-800 text-sm truncate flex-1">
                        {item?.name ?? 'No longer in the library'}
                      </span>
                      <Check className="w-4 h-4 text-parent-primary flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            <SearchInput
              value={addOnQuery}
              onChange={setAddOnQuery}
              placeholder="Add anything from the food library…"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {addOnCandidates.map(({ foodId, item }) => (
                <button
                  key={foodId}
                  type="button"
                  onClick={() => toggle(addOnsGroup, foodId)}
                  className="flex items-center gap-2 rounded-xl p-2 text-left border-2 border-transparent bg-gray-50 hover:bg-gray-100"
                >
                  <img
                    src={item!.imageUrl || getPlaceholderImageUrl()}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover bg-gray-200 flex-shrink-0"
                  />
                  <span className="font-medium text-gray-800 text-sm truncate flex-1">
                    {item!.name}
                  </span>
                  <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>

            {addOnCandidates.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {addOnQuery ? 'Nothing in the library matches that.' : 'Everything is already on the plate.'}
              </p>
            )}
          </section>
        )}

        {/* Pinned: the add-ons list runs the length of the food library, so a
            static action row would sit below a very long scroll. */}
        <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-gray-100 space-y-3">
          {violations.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-warning" role="alert">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{violations.join(' · ')}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={saving || violations.length > 0}
              onClick={() => onSave(draft)}
            >
              {saving ? 'Saving…' : 'Save plate'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
