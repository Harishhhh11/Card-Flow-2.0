import React, { useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { FlowCard, FlowColumn } from '../types';
import { CardItem } from './CardItem';

interface ColumnProps {
  column: FlowColumn;
  columnIndex: number;
  totalColumns: number;
  cards: FlowCard[];
  onOpenCard: (card: FlowCard) => void;
  onMoveCard: (cardId: string, direction: 'left' | 'right') => void;
  onDeleteCard: (cardId: string) => void;
  onDropCard: (cardId: string, targetColumnId: string) => void;
  onQuickAdd: (columnId: string) => void;
}

export const Column: React.FC<ColumnProps> = ({
  column,
  columnIndex,
  totalColumns,
  cards,
  onOpenCard,
  onMoveCard,
  onDeleteCard,
  onDropCard,
  onQuickAdd,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      onDropCard(cardId, column.id);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isOverWip = column.wipLimit !== undefined && cards.length > column.wipLimit;
  const isNearWip = column.wipLimit !== undefined && cards.length === column.wipLimit;

  return (
    <div
      id={`column-${column.id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-80 shrink-0 bg-neutral-100/70 rounded-2xl border transition-all duration-150 ${
        isDragOver
          ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-300'
          : isOverWip
          ? 'border-rose-300 bg-rose-50/30'
          : 'border-neutral-200/90'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 pb-2.5 flex items-center justify-between gap-2 border-b border-neutral-200/60">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-neutral-800 tracking-tight">{column.title}</h2>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-white text-neutral-600 border border-neutral-200 shadow-2xs">
            {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* WIP Limit warning badge */}
          {column.wipLimit && (
            <div
              title={
                isOverWip
                  ? `WIP limit exceeded (${cards.length}/${column.wipLimit})`
                  : `WIP limit: ${column.wipLimit}`
              }
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                isOverWip
                  ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                  : isNearWip
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-neutral-50 text-neutral-500 border-neutral-200'
              }`}
            >
              {isOverWip && <AlertCircle className="w-3 h-3 text-rose-600" />}
              <span>
                {cards.length}/{column.wipLimit} WIP
              </span>
            </div>
          )}

          {/* Quick Add Card Button */}
          <button
            id={`quick-add-${column.id}`}
            onClick={() => onQuickAdd(column.id)}
            title={`Add card to ${column.title}`}
            className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-white rounded-md border border-transparent hover:border-neutral-200 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Column Cards Container */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[350px]">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            columnIndex={columnIndex}
            totalColumns={totalColumns}
            onOpenCard={onOpenCard}
            onMoveCard={onMoveCard}
            onDeleteCard={onDeleteCard}
            onDragStart={handleDragStart}
          />
        ))}

        {cards.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-neutral-200 rounded-xl bg-white/40 text-neutral-400">
            <p className="text-xs font-medium">No cards in this stage</p>
            <p className="text-[11px] text-neutral-400 mt-1">Drop a card here or click +</p>
          </div>
        )}
      </div>

      {/* Quick Add Footer */}
      <div className="p-2.5 pt-0">
        <button
          onClick={() => onQuickAdd(column.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-dashed border-neutral-300 hover:border-indigo-300 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Card</span>
        </button>
      </div>
    </div>
  );
};
