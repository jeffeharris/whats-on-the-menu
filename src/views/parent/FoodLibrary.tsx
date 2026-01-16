import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { FoodItemForm } from '../../components/parent/FoodItemForm';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { FoodItem, FoodCategory } from '../../types';

interface FoodLibraryProps {
  onBack: () => void;
}

export function FoodLibrary({ onBack }: FoodLibraryProps) {
  const { items, addItem, updateItem, deleteItem } = useFoodLibrary();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const mains = items.filter((i) => i.category === 'main');
  const sides = items.filter((i) => i.category === 'side');

  const handleSubmit = async (name: string, category: FoodCategory, imageUrl: string | null) => {
    if (editingItem) {
      await updateItem(editingItem.id, { name, category, imageUrl });
    } else {
      await addItem(name, category, imageUrl);
    }
    setIsFormOpen(false);
    setEditingItem(null);
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

  const renderFoodList = (foodItems: FoodItem[], title: string) => (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      {foodItems.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No {title.toLowerCase()} yet</p>
      ) : (
        <div className="grid gap-3">
          {foodItems.map((item) => {
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
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                </div>
                <div className="flex gap-2">
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
  );

  return (
    <div className="min-h-screen bg-parent-bg p-4 md:p-6">
      <header className="flex items-center gap-4 mb-6 max-w-3xl mx-auto">
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

      <div className="max-w-lg md:max-w-3xl mx-auto md:grid md:grid-cols-2 md:gap-8">
        {renderFoodList(mains, 'Main Dishes')}
        {renderFoodList(sides, 'Side Dishes')}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Food' : 'Add Food'}
      >
        <FoodItemForm
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          initialValues={
            editingItem
              ? {
                  name: editingItem.name,
                  category: editingItem.category,
                  imageUrl: editingItem.imageUrl,
                }
              : undefined
          }
        />
      </Modal>
    </div>
  );
}
