import { useState, useMemo } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { TagFilter } from '../../components/common/TagFilter';
import { FoodItemForm } from '../../components/parent/FoodItemForm';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodItem } from '../../types';

interface FoodLibraryProps {
  onBack: () => void;
}

export function FoodLibrary({ onBack }: FoodLibraryProps) {
  const { items, allTags, addItem, updateItem, deleteItem } = useFoodLibrary();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [prefillName, setPrefillName] = useState('');
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);

  // Filter items based on search and tags
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      // Search filter
      if (query && !item.name.toLowerCase().includes(query)) {
        return false;
      }
      // If excludeTags are set, hide items that have any of them
      if (excludeTags.length > 0 && item.tags?.some((tag) => excludeTags.includes(tag))) {
        return false;
      }
      // If includeTags are set, only show items that have at least one
      if (includeTags.length > 0 && !item.tags?.some((tag) => includeTags.includes(tag))) {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, includeTags, excludeTags]);

  const handleSubmit = async (name: string, tags: string[], imageUrl: string | null) => {
    if (editingItem) {
      await updateItem(editingItem.id, { name, tags, imageUrl });
    } else {
      await addItem(name, tags, imageUrl);
      setSearchQuery(''); // Clear search to show the new item
    }
    setIsFormOpen(false);
    setEditingItem(null);
    setPrefillName('');
  };

  const handleEdit = (item: FoodItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this food item?')) {
      await deleteItem(id);
    }
  };

  const handleImageError = (id: string) => {
    setImageErrors((prev) => new Set(prev).add(id));
  };

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">Food Library</h1>
        <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
          Add Food
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg md:max-w-3xl mx-auto">
          {/* Search and filter */}
          {items.length > 0 && (
            <div className="mb-4 space-y-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search foods..."
              />
              {allTags.length > 0 && (
                <TagFilter
                  allTags={allTags}
                  includeTags={includeTags}
                  excludeTags={excludeTags}
                  onIncludeTagsChange={(tags) => setIncludeTags(tags || [])}
                  onExcludeTagsChange={(tags) => setExcludeTags(tags || [])}
                />
              )}
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No food items yet. Add some!</p>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No foods match your search or filters.</p>
              {searchQuery.trim() && (
                <button
                  onClick={() => {
                    setPrefillName(searchQuery.trim());
                    setIsFormOpen(true);
                  }}
                  className="mt-2 text-parent-primary hover:text-parent-primary-dark underline text-sm"
                >
                  Add "{searchQuery.trim()}" to library
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map((item) => {
                const hasError = imageErrors.has(item.id);
                return (
                  <Card key={item.id} padding="sm" className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={hasError || !item.imageUrl ? getPlaceholderImageUrl() : item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(item.id)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-gray-500 hover:text-parent-primary transition-colors"
                        aria-label={`Edit ${item.name}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-500 hover:text-danger transition-colors"
                        aria-label={`Delete ${item.name}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
          setPrefillName('');
        }}
        title={editingItem ? 'Edit Food' : 'Add Food'}
      >
        <FoodItemForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingItem(null);
            setPrefillName('');
          }}
          initialValues={
            editingItem
              ? {
                  name: editingItem.name,
                  tags: editingItem.tags || [],
                  imageUrl: editingItem.imageUrl,
                }
              : prefillName
                ? { name: prefillName, tags: [], imageUrl: null }
                : undefined
          }
        />
      </Modal>
    </div>
  );
}
