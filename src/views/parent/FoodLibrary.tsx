import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Check, Search, UtensilsCrossed, LayoutList, LayoutGrid, X } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { TagFilter } from '../../components/common/TagFilter';
import { FoodItemForm } from '../../components/parent/FoodItemForm';
import { SortDropdown, type SortOption } from '../../components/parent/SortDropdown';
import { FoodGridItem } from '../../components/parent/FoodGridItem';
import { QuickAddCard } from '../../components/parent/QuickAddCard';
import { BulkTagBar } from '../../components/parent/BulkTagBar';
import { BulkTagPicker } from '../../components/parent/BulkTagPicker';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodItem } from '../../types';

interface FoodLibraryProps {
  onBack: () => void;
}

function getTimestampFromId(id: string): number {
  const dashIndex = id.indexOf('-');
  if (dashIndex === -1) return 0;
  const timestamp = parseInt(id.substring(0, dashIndex), 10);
  return isNaN(timestamp) ? 0 : timestamp;
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
  const [sortOption, setSortOption] = useState<SortOption>('a-z');
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'grid'>('food-library-view', 'list');

  // Bulk mode state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagModalMode, setBulkTagModalMode] = useState<'add' | 'remove' | null>(null);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = items.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query)) return false;
      if (excludeTags.length > 0 && item.tags?.some((tag) => excludeTags.includes(tag))) return false;
      if (includeTags.length > 0 && !item.tags?.some((tag) => includeTags.includes(tag))) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'a-z': return a.name.localeCompare(b.name);
        case 'z-a': return b.name.localeCompare(a.name);
        case 'newest': return getTimestampFromId(b.id) - getTimestampFromId(a.id);
        case 'oldest': return getTimestampFromId(a.id) - getTimestampFromId(b.id);
        default: return 0;
      }
    });
  }, [items, searchQuery, includeTags, excludeTags, sortOption]);

  const handleSubmit = async (name: string, tags: string[], imageUrl: string | null) => {
    if (editingItem) {
      await updateItem(editingItem.id, { name, tags, imageUrl });
    } else {
      await addItem(name, tags, imageUrl);
      setSearchQuery('');
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

  // Bulk mode handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map(i => i.id)));
    }
  };

  const handleExitBulkMode = () => {
    setIsBulkMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkAddTag = async (tag: string) => {
    const promises = Array.from(selectedIds).map(id => {
      const item = items.find(i => i.id === id);
      if (item && !item.tags.includes(tag)) {
        return updateItem(id, { tags: [...item.tags, tag] });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    setBulkTagModalMode(null);
  };

  const handleBulkRemoveTag = async (tag: string) => {
    const promises = Array.from(selectedIds).map(id => {
      const item = items.find(i => i.id === id);
      if (item && item.tags.includes(tag)) {
        return updateItem(id, { tags: item.tags.filter(t => t !== tag) });
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    setBulkTagModalMode(null);
  };

  const handleQuickAdd = (name: string) => {
    setPrefillName(name);
    setIsFormOpen(true);
  };

  // Tags present on selected items (for remove mode)
  const selectedItemTags = useMemo(() => {
    return Array.from(new Set(
      items
        .filter(i => selectedIds.has(i.id))
        .flatMap(i => i.tags || [])
    )).sort();
  }, [items, selectedIds]);

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        {isBulkMode ? (
          <>
            <button
              onClick={handleExitBulkMode}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Exit selection mode"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {selectedIds.size} selected
            </h1>
            <button
              onClick={handleSelectAll}
              className="text-sm text-parent-primary hover:text-parent-primary/80 font-medium"
            >
              {selectedIds.size === filteredAndSortedItems.length ? 'Deselect All' : 'Select All'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800 flex-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Food Library
            </h1>
            {items.length > 0 && (
              <button
                onClick={() => setIsBulkMode(true)}
                className="text-sm text-parent-primary hover:text-parent-primary/80 font-medium px-2 py-1"
              >
                Select
              </button>
            )}
            <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
              <span className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Add
              </span>
            </Button>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg md:max-w-3xl mx-auto">
          {/* Search, Sort, View Toggle, Tag Filter */}
          {items.length > 0 && (
            <div className="mb-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search foods..."
                  />
                </div>
                <SortDropdown value={sortOption} onChange={setSortOption} />
                <button
                  onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  className="flex items-center justify-center w-10 h-10 text-gray-600
                             bg-white border border-gray-300 rounded-lg
                             hover:bg-gray-50 transition-colors flex-shrink-0"
                  aria-label={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
                >
                  {viewMode === 'list'
                    ? <LayoutGrid className="w-4 h-4" />
                    : <LayoutList className="w-4 h-4" />
                  }
                </button>
              </div>
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

          {/* Item count + divider */}
          {filteredAndSortedItems.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-xs font-semibold tracking-widest uppercase text-gray-400"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
            </div>
          )}

          {/* Content */}
          {items.length === 0 ? (
            /* Empty library */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-parent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed className="w-8 h-8 text-parent-primary/60" />
              </div>
              <p className="text-gray-500 text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                No food items yet
              </p>
              <p className="text-gray-400 text-sm mt-1">Add your first food to get started!</p>
              <Button variant="primary" className="mt-4" onClick={() => setIsFormOpen(true)}>
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add Food
                </span>
              </Button>
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            /* No results */
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm">No foods match your search or filters.</p>
              </div>
              {searchQuery.trim() && (
                <QuickAddCard searchQuery={searchQuery} onAdd={handleQuickAdd} />
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid view */
            <div className="grid grid-cols-2 gap-3">
              {filteredAndSortedItems.map((item, index) => (
                <FoodGridItem
                  key={item.id}
                  item={item}
                  imageError={imageErrors.has(item.id)}
                  onImageError={handleImageError}
                  onEdit={handleEdit}
                  isSelectable={isBulkMode}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  animationDelay={Math.min(index * 50, 500)}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <div className="grid gap-3">
              {filteredAndSortedItems.map((item, index) => {
                const hasError = imageErrors.has(item.id);
                return (
                  <Card
                    key={item.id}
                    padding="sm"
                    className="fade-up-in"
                    style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                    onClick={isBulkMode ? () => handleToggleSelect(item.id) : undefined}
                    selected={isBulkMode && selectedIds.has(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isBulkMode && (
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                                        ${selectedIds.has(item.id)
                                          ? 'bg-parent-primary border-parent-primary'
                                          : 'border-gray-300'
                                        }`}>
                          {selectedIds.has(item.id) && <Check className="w-4 h-4 text-white" />}
                        </div>
                      )}
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
                      {!isBulkMode && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-gray-500 hover:text-parent-primary transition-colors"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-500 hover:text-danger transition-colors"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bulk action footer */}
      {isBulkMode && (
        <BulkTagBar
          selectedCount={selectedIds.size}
          onAddTag={() => setBulkTagModalMode('add')}
          onRemoveTag={() => setBulkTagModalMode('remove')}
          onCancel={handleExitBulkMode}
        />
      )}

      {/* Bulk tag picker modal */}
      <BulkTagPicker
        isOpen={bulkTagModalMode !== null}
        mode={bulkTagModalMode || 'add'}
        availableTags={bulkTagModalMode === 'remove' ? selectedItemTags : allTags}
        onSelect={bulkTagModalMode === 'add' ? handleBulkAddTag : handleBulkRemoveTag}
        onClose={() => setBulkTagModalMode(null)}
      />

      {/* Add/Edit form modal */}
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
