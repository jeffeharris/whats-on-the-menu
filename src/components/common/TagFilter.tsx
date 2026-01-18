interface TagFilterProps {
  allTags: string[];
  includeTags: string[];
  excludeTags: string[];
  onIncludeTagsChange: (tags: string[] | undefined) => void;
  onExcludeTagsChange: (tags: string[] | undefined) => void;
  label?: string;
}

export function TagFilter({
  allTags,
  includeTags,
  excludeTags,
  onIncludeTagsChange,
  onExcludeTagsChange,
  label = 'Filter:',
}: TagFilterProps) {
  // 3-state toggle: neutral → include → exclude → neutral
  const handleTagToggle = (tag: string) => {
    const isIncluded = includeTags.includes(tag);
    const isExcluded = excludeTags.includes(tag);

    if (!isIncluded && !isExcluded) {
      // Neutral → Include
      onIncludeTagsChange([...includeTags, tag]);
    } else if (isIncluded) {
      // Include → Exclude
      const newInclude = includeTags.filter((t) => t !== tag);
      onIncludeTagsChange(newInclude.length > 0 ? newInclude : undefined);
      onExcludeTagsChange([...excludeTags, tag]);
    } else {
      // Exclude → Neutral
      const newExclude = excludeTags.filter((t) => t !== tag);
      onExcludeTagsChange(newExclude.length > 0 ? newExclude : undefined);
    }
  };

  const handleClearAll = () => {
    onIncludeTagsChange(undefined);
    onExcludeTagsChange(undefined);
  };

  const hasActiveFilters = includeTags.length > 0 || excludeTags.length > 0;

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">{label}</span>
      {allTags.map((tag) => {
        const isIncluded = includeTags.includes(tag);
        const isExcluded = excludeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => handleTagToggle(tag)}
            className={`
              px-2 py-0.5 rounded-full text-xs transition-colors
              ${isIncluded
                ? 'bg-success text-white'
                : isExcluded
                  ? 'bg-danger text-white line-through'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            title={isIncluded ? 'Including (click to exclude)' : isExcluded ? 'Excluding (click to reset)' : 'Click to include'}
          >
            {isIncluded && '+ '}
            {isExcluded && '- '}
            {tag}
          </button>
        );
      })}
      {hasActiveFilters && (
        <button
          onClick={handleClearAll}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
