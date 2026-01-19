import { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { sharedMenusApi } from '../../api/client';
import type { SharedMenu, SharedMenuResponse } from '../../types';

interface SharedMenuResponsesProps {
  menuId: string;
  onBack: () => void;
}

export function SharedMenuResponses({ menuId, onBack }: SharedMenuResponsesProps) {
  const [menu, setMenu] = useState<SharedMenu | null>(null);
  const [responses, setResponses] = useState<SharedMenuResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [menuData, responsesData] = await Promise.all([
          sharedMenusApi.get(menuId),
          sharedMenusApi.getResponses(menuId),
        ]);
        setMenu(menuData.menu);
        setResponses(responsesData.responses);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [menuId]);

  const copyShareLink = async () => {
    if (!menu) return;
    const url = `${window.location.origin}/share/${menu.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  };

  // Get option text by ID from menu groups
  const getOptionText = (optionId: string): string => {
    if (!menu) return optionId;
    for (const group of menu.groups) {
      const option = group.options.find((o) => o.id === optionId);
      if (option) return option.text;
    }
    return optionId;
  };

  // Get group label by ID
  const getGroupLabel = (groupId: string): string => {
    if (!menu) return groupId;
    const group = menu.groups.find((g) => g.id === groupId);
    return group?.label || groupId;
  };

  if (loading) {
    return (
      <div className="h-full bg-parent-bg flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="h-full bg-parent-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Menu not found</p>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 p-4 border-b bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Go back">
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{menu.title}</h1>
              <p className="text-sm text-gray-500">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
            <code className="flex-1 text-sm text-gray-600 truncate">/share/{menu.token}</code>
            <Button size="sm" variant={copiedToken ? 'secondary' : 'ghost'} onClick={copyShareLink}>
              {copiedToken ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {responses.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 mb-2">No responses yet</p>
                <p className="text-sm text-gray-400">Share the link to start collecting responses</p>
              </div>
            </Card>
          ) : (
            responses
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((response) => (
                <Card key={response.id}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">{response.respondentName}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(response.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(response.selections).map(([groupId, optionIds]) => (
                        <div key={groupId} className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-500 mb-1">{getGroupLabel(groupId)}</p>
                          <div className="flex flex-wrap gap-2">
                            {optionIds.map((optionId) => (
                              <span
                                key={optionId}
                                className="px-2 py-1 bg-white border border-gray-200 rounded text-sm"
                              >
                                {getOptionText(optionId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
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
