import { useState, useMemo } from 'react';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';

interface TagInputProps {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  selectedTags,
  availableTags,
  onChange,
  placeholder = 'Type to add tags...',
}: TagInputProps) {
  const [query, setQuery] = useState('');

  // Filter available tags based on query, excluding already selected tags
  const filteredTags = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    return availableTags
      .filter((tag) => !selectedTags.includes(tag))
      .filter((tag) => lowerQuery === '' || tag.toLowerCase().includes(lowerQuery));
  }, [availableTags, selectedTags, query]);

  // Check if query matches any existing tag (case-insensitive)
  const queryMatchesExisting = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    return availableTags.some((tag) => tag.toLowerCase() === lowerQuery);
  }, [availableTags, query]);

  // Show "Create" option if query doesn't match existing tags and isn't already selected
  const showCreateOption = query.trim() !== '' &&
    !queryMatchesExisting &&
    !selectedTags.some((tag) => tag.toLowerCase() === query.toLowerCase().trim());

  const handleSelect = (value: string | null) => {
    if (!value) return;

    // Check if this is a "create new" action
    if (value.startsWith('__create__:')) {
      const newTag = value.replace('__create__:', '');
      if (newTag && !selectedTags.includes(newTag)) {
        onChange([...selectedTags, newTag]);
      }
    } else if (!selectedTags.includes(value)) {
      onChange([...selectedTags, value]);
    }
    setQuery('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter to create new tag if no options are highlighted
    if (e.key === 'Enter' && showCreateOption && query.trim()) {
      e.preventDefault();
      const newTag = query.trim();
      if (!selectedTags.includes(newTag)) {
        onChange([...selectedTags, newTag]);
      }
      setQuery('');
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected tags as chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-parent-primary/10 text-parent-primary rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:bg-parent-primary/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Combobox input */}
      <Combobox value={null} onChange={handleSelect}>
        <div className="relative">
          <ComboboxInput
            className="
              w-full px-4 py-2 rounded-lg border border-gray-300
              focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent
            "
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {(filteredTags.length > 0 || showCreateOption) && (
            <ComboboxOptions className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg bg-white border border-gray-200 shadow-lg">
              {filteredTags.map((tag) => (
                <ComboboxOption
                  key={tag}
                  value={tag}
                  className="px-4 py-2 cursor-pointer data-[focus]:bg-parent-primary/10 data-[selected]:bg-parent-primary/20"
                >
                  {tag}
                </ComboboxOption>
              ))}
              {showCreateOption && (
                <ComboboxOption
                  value={`__create__:${query.trim()}`}
                  className="px-4 py-2 cursor-pointer data-[focus]:bg-parent-primary/10 text-parent-primary"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create "{query.trim()}"
                  </span>
                </ComboboxOption>
              )}
            </ComboboxOptions>
          )}
        </div>
      </Combobox>
    </div>
  );
}
