import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Plus } from 'lucide-react';

interface BulkTagPickerProps {
  isOpen: boolean;
  mode: 'add' | 'remove';
  availableTags: string[];
  onSelect: (tag: string) => void;
  onClose: () => void;
}

export function BulkTagPicker({ isOpen, mode, availableTags, onSelect, onClose }: BulkTagPickerProps) {
  const [customTag, setCustomTag] = useState('');

  const handleCreateAndSelect = () => {
    const trimmed = customTag.trim();
    if (trimmed) {
      onSelect(trimmed);
      setCustomTag('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Tag to Selected' : 'Remove Tag from Selected'}
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          {mode === 'add'
            ? 'Choose a tag to add to all selected items:'
            : 'Choose a tag to remove from selected items:'}
        </p>
        {availableTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelect(tag)}
                className="px-3 py-1.5 text-sm rounded-full
                           bg-gray-100 text-gray-700 hover:bg-parent-primary/10
                           hover:text-parent-primary transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No tags to remove from selected items.</p>
        )}
        {mode === 'add' && (
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Or type a new tag..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-parent-primary focus:border-transparent"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndSelect(); } }}
            />
            <Button variant="primary" size="sm" onClick={handleCreateAndSelect} disabled={!customTag.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
