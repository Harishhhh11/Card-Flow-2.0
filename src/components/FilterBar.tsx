import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { FilterOptions, Priority } from '../types';
import { INITIAL_TAGS } from '../data/initialData';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (updated: Partial<FilterOptions>) => void;
  onResetFilters: () => void;
  totalCards: number;
  filteredCardsCount: number;
}

const PRIORITIES: { label: string; value: Priority | 'all'; color: string }[] = [
  { label: 'All Priorities', value: 'all', color: 'text-neutral-700 bg-neutral-100 hover:bg-neutral-200' },
  { label: 'Urgent', value: 'urgent', color: 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { label: 'High', value: 'high', color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { label: 'Medium', value: 'medium', color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { label: 'Low', value: 'low', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalCards,
  filteredCardsCount,
}) => {
  const isFiltered = filters.search.trim() !== '' || filters.priority !== 'all' || filters.tag !== 'all';

  return (
    <div id="filter-bar" className="bg-white border-b border-neutral-200/80 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            id="card-search-input"
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search cards by title, tag, or description..."
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-neutral-50 border border-neutral-300 rounded-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Priority & Tag Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            <select
              id="filter-priority-select"
              value={filters.priority}
              onChange={(e) => onFilterChange({ priority: e.target.value as Priority | 'all' })}
              className="text-xs font-medium px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="all">Priority: All</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div className="flex items-center gap-1">
            <select
              id="filter-tag-select"
              value={filters.tag}
              onChange={(e) => onFilterChange({ tag: e.target.value })}
              className="text-xs font-medium px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="all">Tag: All</option>
              {INITIAL_TAGS.map((t) => (
                <option key={t.id} value={t.name}>
                  🏷️ {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filter Button */}
          {isFiltered && (
            <button
              id="clear-filters-btn"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter ({filteredCardsCount}/{totalCards})</span>
            </button>
          )}

          {!isFiltered && (
            <span className="text-xs text-neutral-500 font-medium px-2 py-1">
              {totalCards} cards in board
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
