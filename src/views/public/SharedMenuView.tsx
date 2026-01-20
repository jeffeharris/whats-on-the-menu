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
        // Deselect if already selected
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      } else {
        if (current.length >= preset.max) {
          // At max - replace the oldest selection with the new one
          const newSelections = [...current.slice(1), optionId];
          return { ...prev, [groupId]: newSelections };
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
    });
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
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{menu.title}</h1>
          {menu.description && <p className="text-zinc-400 text-lg">{menu.description}</p>}
        </div>

        {/* Name Input */}
        <div className="mb-8 max-w-md mx-auto">
          <input
            type="text"
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            className="w-full px-0 py-3 bg-transparent border-0 border-b-2 border-zinc-800 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 text-xl text-center"
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
              <div key={group.id} className="mb-12">
                <div className="flex items-baseline justify-between mb-6 px-2">
                  <h2 className="text-lg font-semibold text-zinc-300 uppercase tracking-wider">{group.label}</h2>
                  <span className="text-sm text-zinc-500 font-medium">
                    {selectedCount} of {preset.max}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {group.options
                    .sort((a, b) => a.order - b.order)
                    .map((option) => {
                      const isSelected = (selections[group.id] || []).includes(option.id);

                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleSelection(group.id, option.id, group)}
                          className={`relative aspect-[3/4] sm:aspect-square rounded-3xl overflow-hidden transition-all duration-200 ${
                            isSelected
                              ? 'ring-4 ring-white scale-[1.02] shadow-2xl shadow-white/20'
                              : 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                          }`}
                        >
                          {/* Background image or gradient */}
                          {option.imageUrl ? (
                            <img
                              src={option.imageUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                          )}

                          {/* Overlay gradient for text readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Content */}
                          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6">
                            <span className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg leading-tight">
                              {option.text}
                            </span>
                          </div>

                          {/* Selection indicator */}
                          <div
                            className={`absolute top-4 right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-white bg-white'
                                : 'border-white/50 bg-black/30'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
        <div className="sticky bottom-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-5 bg-white text-zinc-950 text-xl font-bold rounded-2xl hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99]"
          >
            {submitting ? 'Submitting...' : "I'm Done!"}
          </button>
        </div>
      </div>
    </div>
  );
}
