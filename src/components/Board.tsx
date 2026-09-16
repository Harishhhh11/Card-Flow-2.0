import React from 'react';
import { FlowCard, FlowColumn, FilterOptions } from '../types';
import { Column } from './Column';
import { SearchX } from 'lucide-react';

interface BoardProps {
  columns: FlowColumn[];
  cards: FlowCard[];
  filters: FilterOptions;
  onOpenCard: (card: FlowCard) => void;
  onMoveCard: (cardId: string, direction: 'left' | 'right') => void;
  onDeleteCard: (cardId: string) => void;
  onDropCard: (cardId: string, targetColumnId: string) => void;
  onQuickAdd: (columnId: string) => void;
  onResetFilters: () => void;
}

export const Board: React.FC<BoardProps> = ({
  columns,
  cards,
  filters,
  onOpenCard,
  onMoveCard,
  onDeleteCard,
  onDropCard,
  onQuickAdd,
  onResetFilters,
}) => {
  // Filter cards according to active search, priority, tag
  const filteredCards = cards.filter((card) => {
    // Search query filter
    if (filters.search.trim() !== '') {
      const q = filters.search.toLowerCase();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchDesc = card.description.toLowerCase().includes(q);
      const matchTags = card.tags.some((t) => t.toLowerCase().includes(q));
      const matchAssignee = card.assignee?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchTags && !matchAssignee) {
        return false;
      }
    }

    // Priority filter
    if (filters.priority !== 'all' && card.priority !== filters.priority) {
      return false;
    }

    // Tag filter
    if (filters.tag !== 'all' && !card.tags.includes(filters.tag)) {
      return false;
    }

    return true;
  });

  const isFilterActive =
    filters.search.trim() !== '' || filters.priority !== 'all' || filters.tag !== 'all';

  return (
    <main id="board-container" className="flex-1 overflow-x-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* If filter resulted in 0 cards across entire board */}
        {isFilterActive && filteredCards.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200 p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto mb-3">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">No matching cards found</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Try adjusting your search query, priority filter, or selected tag.
            </p>
            <button
              onClick={onResetFilters}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="flex gap-5 items-start overflow-x-auto pb-6">
            {columns.map((column, idx) => {
              const columnCards = filteredCards.filter((c) => c.columnId === column.id);
              return (
                <Column
                  key={column.id}
                  column={column}
                  columnIndex={idx}
                  totalColumns={columns.length}
                  cards={columnCards}
                  onOpenCard={onOpenCard}
                  onMoveCard={onMoveCard}
                  onDeleteCard={onDeleteCard}
                  onDropCard={onDropCard}
                  onQuickAdd={onQuickAdd}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
