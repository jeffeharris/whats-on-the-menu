import { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useSharedMenu } from '../../contexts/SharedMenuContext';
import { generateAIImageUrl } from '../../utils/aiImageGenerator';
import type { SharedMenuGroup, SharedMenuOption, SelectionPreset } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

interface SharedMenuBuilderProps {
  onBack: () => void;
  onSuccess: (menuId: string, token: string) => void;
}

function generateOptionId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function SharedMenuBuilder({ onBack, onSuccess }: SharedMenuBuilderProps) {
  const { createMenu } = useSharedMenu();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [groups, setGroups] = useState<SharedMenuGroup[]>([
    {
      id: 'group-1',
      label: 'Options',
      options: [],
      selectionPreset: 'pick-1',
      order: 0,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);

  const addOption = (groupId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;

        const newOption: SharedMenuOption = {
          id: generateOptionId(),
          text: '',
          imageUrl: null,
          order: group.options.length,
        };

        return { ...group, options: [...group.options, newOption] };
      })
    );
  };

  const updateOption = (groupId: string, optionId: string, updates: Partial<SharedMenuOption>) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          options: group.options.map((opt) => (opt.id === optionId ? { ...opt, ...updates } : opt)),
        };
      })
    );
  };

  const removeOption = (groupId: string, optionId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          options: group.options.filter((opt) => opt.id !== optionId),
        };
      })
    );
  };

  const generateImage = async (groupId: string, optionId: string, text: string) => {
    if (!text.trim()) return;

    setGeneratingImage(optionId);
    try {
      const imageUrl = generateAIImageUrl(text);
      updateOption(groupId, optionId, { imageUrl });
    } finally {
      setGeneratingImage(null);
    }
  };

  const addGroup = () => {
    const newGroup: SharedMenuGroup = {
      id: generateGroupId(),
      label: 'New Group',
      options: [],
      selectionPreset: 'pick-1',
      order: groups.length,
    };
    setGroups((prev) => [...prev, newGroup]);
  };

  const updateGroup = (groupId: string, updates: Partial<SharedMenuGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
  };

  const removeGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (groups.some((g) => g.options.length === 0)) {
      alert('Each group needs at least one option');
      return;
    }

    if (groups.some((g) => g.options.some((opt) => !opt.text.trim()))) {
      alert('All options need text');
      return;
    }

    setSaving(true);
    try {
      const menu = await createMenu(title, description || undefined, groups);
      onSuccess(menu.id, menu.token);
    } catch (error) {
      console.error('Failed to create menu:', error);
      alert('Failed to create menu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 p-4 border-b bg-white">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Go back">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-800">Create Shareable Menu</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title & Description */}
          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parent-primary focus:border-transparent"
                  placeholder="e.g., Pizza Party Options, Date Night Ideas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parent-primary focus:border-transparent"
                  rows={2}
                  placeholder="Add any details or instructions..."
                />
              </div>
            </div>
          </Card>

          {/* Groups */}
          {groups.map((group, groupIndex) => (
            <Card key={group.id}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={group.label}
                    onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                    className="flex-1 text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-parent-primary outline-none py-1"
                    placeholder="Group name"
                  />
                  <select
                    value={group.selectionPreset}
                    onChange={(e) => updateGroup(group.id, { selectionPreset: e.target.value as SelectionPreset })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {Object.entries(SELECTION_PRESET_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                  {groups.length > 1 && (
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      aria-label="Remove group"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {group.options.map((option) => (
                    <div key={option.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                      {/* Image preview */}
                      <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
                        {option.imageUrl ? (
                          <img src={option.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-1">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Text input */}
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(group.id, option.id, { text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-parent-primary focus:border-transparent"
                          placeholder="Option text..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => generateImage(group.id, option.id, option.text)}
                            disabled={!option.text.trim() || generatingImage === option.id}
                          >
                            {generatingImage === option.id ? 'Generating...' : 'Generate Image'}
                          </Button>
                          <button
                            onClick={() => removeOption(group.id, option.id)}
                            className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="ghost" size="sm" onClick={() => addOption(group.id)}>
                  + Add Option
                </Button>
              </div>
            </Card>
          ))}

          <Button variant="ghost" onClick={addGroup} fullWidth>
            + Add Another Group
          </Button>

          <div className="pt-4">
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving ? 'Creating...' : 'Create & Get Share Link'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
