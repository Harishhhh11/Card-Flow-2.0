import React, { useState, useEffect, useRef } from 'react';
import { FlowCard, FlowColumn, FilterOptions } from './types';
import { INITIAL_COLUMNS, INITIAL_CARDS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { Board } from './components/Board';
import { CardModal } from './components/CardModal';
import { NewCardModal } from './components/NewCardModal';

const STORAGE_KEY_CARDS = 'cardflow_cards_v1';
const STORAGE_KEY_COLS = 'cardflow_columns_v1';

export const App: React.FC = () => {
  // Load from local storage or fallback to initial seed
  const [columns, setColumns] = useState<FlowColumn[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved columns', e);
      }
    }
    return INITIAL_COLUMNS;
  });

  const [cards, setCards] = useState<FlowCard[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CARDS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved cards', e);
      }
    }
    return INITIAL_CARDS;
  });

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    priority: 'all',
    tag: 'all',
  });

  // Modals state
  const [activeCard, setActiveCard] = useState<FlowCard | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCardTargetCol, setNewCardTargetCol] = useState<string>('col-backlog');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(columns));
  }, [columns]);

  // Flow card left or right between columns
  const handleMoveCard = (cardId: string, direction: 'left' | 'right') => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (!card) return prev;
      const currentIndex = columns.findIndex((col) => col.id === card.columnId);
      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= columns.length) return prev;

      const targetColumn = columns[targetIndex];
      return prev.map((c) =>
        c.id === cardId ? { ...c, columnId: targetColumn.id, updatedAt: new Date().toISOString() } : c
      );
    });
  };

  // Drop card into specific column
  const handleDropCard = (cardId: string, targetColumnId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, columnId: targetColumnId, updatedAt: new Date().toISOString() } : c
      )
    );
  };

  // Save changes to card from modal
  const handleSaveCard = (updatedCard: FlowCard) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // Create new card
  const handleCreateCard = (
    newCardData: Omit<FlowCard, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newCard: FlowCard = {
      ...newCardData,
      id: `card-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCards((prev) => [newCard, ...prev]);
  };

  // Quick add button in a column
  const handleQuickAdd = (columnId: string) => {
    setNewCardTargetCol(columnId);
    setIsNewModalOpen(true);
  };

  // Reset sample data
  const handleResetData = () => {
    if (confirm('Reset workspace cards and stages to default sample data?')) {
      setColumns(INITIAL_COLUMNS);
      setCards(INITIAL_CARDS);
      localStorage.removeItem(STORAGE_KEY_CARDS);
      localStorage.removeItem(STORAGE_KEY_COLS);
    }
  };

  // Export board data as JSON file
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      columns,
      cards,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cardflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Trigger file import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.cards && Array.isArray(data.cards)) {
          setCards(data.cards);
        }
        if (data.columns && Array.isArray(data.columns)) {
          setColumns(data.columns);
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Calculate filtered cards count for filter bar
  const filteredCount = cards.filter((card) => {
    if (filters.search.trim() !== '') {
      const q = filters.search.toLowerCase();
      const match =
        card.title.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.tags.some((t) => t.toLowerCase().includes(q)) ||
        card.assignee?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.priority !== 'all' && card.priority !== filters.priority) return false;
    if (filters.tag !== 'all' && !card.tags.includes(filters.tag)) return false;
    return true;
  }).length;

  return (
    <div id="cardflow-app" className="min-h-screen bg-neutral-100/50 flex flex-col font-sans">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Navigation Header */}
      <Navbar
        cards={cards}
        onNewCard={() => {
          setNewCardTargetCol('col-backlog');
          setIsNewModalOpen(true);
        }}
        onResetData={handleResetData}
        onExport={handleExport}
        onImport={handleImportClick}
      />

      {/* Filter and Search Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() => setFilters({ search: '', priority: 'all', tag: 'all' })}
        totalCards={cards.length}
        filteredCardsCount={filteredCount}
      />

      {/* Kanban Board */}
      <Board
        columns={columns}
        cards={cards}
        filters={filters}
        onOpenCard={(card) => setActiveCard(card)}
        onMoveCard={handleMoveCard}
        onDeleteCard={handleDeleteCard}
        onDropCard={handleDropCard}
        onQuickAdd={handleQuickAdd}
        onResetFilters={() => setFilters({ search: '', priority: 'all', tag: 'all' })}
      />

      {/* Card Details / Edit Modal */}
      <CardModal
        card={activeCard}
        columns={columns}
        isOpen={!!activeCard}
        onClose={() => setActiveCard(null)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
      />

      {/* Create New Card Modal */}
      <NewCardModal
        isOpen={isNewModalOpen}
        defaultColumnId={newCardTargetCol}
        columns={columns}
        onClose={() => setIsNewModalOpen(false)}
        onCreateCard={handleCreateCard}
      />
    </div>
  );
};

export default App;
