import { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useSharedMenu } from '../../contexts/SharedMenuContext';
import type { SharedMenu, SharedMenuResponse } from '../../types';

interface SharedMenusListProps {
  onBack: () => void;
  onCreateNew: () => void;
  onViewResponses: (menuId: string) => void;
}

export function SharedMenusList({ onBack, onCreateNew, onViewResponses }: SharedMenusListProps) {
  const { menus, loading, deleteMenu, getResponses } = useSharedMenu();
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Load response counts for each menu
  useEffect(() => {
    let cancelled = false;

    async function loadResponseCounts() {
      try {
        const counts = await Promise.all(
          menus.map(async (menu) => {
            try {
              const responses = await getResponses(menu.id);
              return [menu.id, responses.length] as const;
            } catch {
              return [menu.id, 0] as const;
            }
          })
        );

        if (!cancelled) {
          setResponseCounts(Object.fromEntries(counts));
        }
      } catch (error) {
        console.error('Failed to load response counts:', error);
      }
    }

    if (menus.length > 0) {
      loadResponseCounts();
    }

    return () => {
      cancelled = true;
    };
  }, [menus, getResponses]);

  const copyShareLink = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback for older browsers
      prompt('Copy this link:', url);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shared menu and all responses?')) return;

    try {
      await deleteMenu(id);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete menu');
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-parent-bg flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 p-4 border-b bg-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Go back">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Shared Menus</h1>
          </div>
          <Button size="sm" onClick={onCreateNew}>
            + Create New
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {menus.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No shared menus yet</p>
                <Button onClick={onCreateNew}>Create Your First Shared Menu</Button>
              </div>
            </Card>
          ) : (
            menus.map((menu) => (
              <Card key={menu.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-800">{menu.title}</h3>
                      {menu.description && <p className="text-sm text-gray-600 mt-1">{menu.description}</p>}
                      <p className="text-xs text-gray-500 mt-2">
                        Created {new Date(menu.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {responseCounts[menu.id] !== undefined && responseCounts[menu.id] > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {responseCounts[menu.id]} response{responseCounts[menu.id] !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          menu.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {menu.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <code className="flex-1 text-sm text-gray-600 truncate">/share/{menu.token}</code>
                    <Button
                      size="sm"
                      variant={copiedToken === menu.token ? 'secondary' : 'ghost'}
                      onClick={() => copyShareLink(menu.token)}
                    >
                      {copiedToken === menu.token ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => onViewResponses(menu.id)}>
                      View Responses
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(menu.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
