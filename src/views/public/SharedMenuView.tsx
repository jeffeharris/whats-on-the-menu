import { useState, useEffect } from 'react';
import { sharedMenusApi } from '../../api/client';
import type { SharedMenu, SharedMenuGroup } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

interface SharedMenuViewProps {
  token: string;
}

export function SharedMenuView({ token }: SharedMenuViewProps) {
  const [menu, setMenu] = useState<SharedMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondentName, setRespondentName] = useState('');
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    sharedMenusApi
      .getByToken(token)
      .then((data) => {
        setMenu(data.menu);
        const initial: Record<string, string[]> = {};
        data.menu.groups.forEach((group) => {
          initial[group.id] = [];
        });
        setSelections(initial);
      })
      .catch(() => setError('Menu not found or no longer available'))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleSelection = (groupId: string, optionId: string, group: SharedMenuGroup) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const preset = SELECTION_PRESET_CONFIG[group.selectionPreset];

      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      } else {
        if (current.length >= preset.max) {
          return prev;
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
    });
  };

  const isGroupAtMax = (groupId: string, group: SharedMenuGroup): boolean => {
    const current = selections[groupId] || [];
    const preset = SELECTION_PRESET_CONFIG[group.selectionPreset];
    return current.length >= preset.max;
  };

  const handleSubmit = async () => {
    if (!respondentName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!menu) return;

    for (const group of menu.groups) {
      const selected = selections[group.id] || [];
      const preset = SELECTION_PRESET_CONFIG[group.selectionPreset];

      if (selected.length < preset.min) {
        alert(`Please select ${preset.label.toLowerCase()} for "${group.label}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await sharedMenusApi.submitResponse(token, respondentName.trim(), selections);
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <p className="text-zinc-500">{error || 'Not found'}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-zinc-400 text-lg">Got it, {respondentName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-medium text-white mb-2">{menu.title}</h1>
          {menu.description && <p className="text-zinc-500">{menu.description}</p>}
        </div>

        {/* Name Input */}
        <div className="mb-10">
          <input
            type="text"
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            className="w-full px-0 py-3 bg-transparent border-0 border-b border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 text-lg"
            placeholder="Your name"
          />
        </div>

        {/* Groups */}
        {menu.groups
          .sort((a, b) => a.order - b.order)
          .map((group) => {
            const preset = SELECTION_PRESET_CONFIG[group.selectionPreset];
            const selectedCount = (selections[group.id] || []).length;

            return (
              <div key={group.id} className="mb-10">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{group.label}</h2>
                  <span className="text-xs text-zinc-600">
                    {selectedCount}/{preset.max}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.options
                    .sort((a, b) => a.order - b.order)
                    .map((option) => {
                      const isSelected = (selections[group.id] || []).includes(option.id);
                      const atMax = isGroupAtMax(group.id, group);
                      const isDisabled = !isSelected && atMax;

                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleSelection(group.id, option.id, group)}
                          disabled={isDisabled}
                          className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors text-left ${
                            isSelected
                              ? 'bg-zinc-800'
                              : isDisabled
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-zinc-900'
                          }`}
                        >
                          {option.imageUrl && (
                            <img
                              src={option.imageUrl}
                              alt=""
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="flex-1 text-zinc-200">{option.text}</span>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'border-white bg-white'
                                : 'border-zinc-700'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-white text-zinc-950 font-medium rounded-lg hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors"
        >
          {submitting ? 'Submitting...' : 'Done'}
        </button>
      </div>
    </div>
  );
}
