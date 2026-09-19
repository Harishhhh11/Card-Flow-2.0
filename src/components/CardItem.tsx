import React from 'react';
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  User,
} from 'lucide-react';
import { FlowCard, Priority } from '../types';

interface CardItemProps {
  card: FlowCard;
  columnIndex: number;
  totalColumns: number;
  onOpenCard: (card: FlowCard) => void;
  onMoveCard: (cardId: string, direction: 'left' | 'right') => void;
  onDeleteCard: (cardId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, cardId: string) => void;
}

const PRIORITY_STYLES: Record<Priority, { label: string; badge: string; border: string }> = {
  urgent: {
    label: 'Urgent',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-l-rose-500',
  },
  high: {
    label: 'High',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    border: 'border-l-amber-500',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    border: 'border-l-blue-500',
  },
  low: {
    label: 'Low',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-l-emerald-500',
  },
};

export const CardItem: React.FC<CardItemProps> = ({
  card,
  columnIndex,
  totalColumns,
  onOpenCard,
  onMoveCard,
  onDeleteCard,
  onDragStart,
}) => {
  const checklistItems = card.checklist || [];
  const completedChecklist = checklistItems.filter((item: any) => item.completed).length;
  const totalChecklist = checklistItems.length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;
  const priorityInfo = PRIORITY_STYLES[card.priority];

  // Check if overdue
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && card.columnId !== 'col-done';

  return (
    <div
      id={`card-${card.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="group relative bg-white rounded-xl border border-neutral-200 shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-neutral-300 overflow-hidden"
    >
      {/* Priority accent line on top edge */}
      <div
        className={`h-1 w-full ${
          card.priority === 'urgent'
            ? 'bg-rose-500'
            : card.priority === 'high'
            ? 'bg-amber-500'
            : card.priority === 'medium'
            ? 'bg-blue-500'
            : 'bg-emerald-500'
        }`}
      />

      <div className="p-3.5 space-y-3">
        {/* Top Header: Priority Badge + Flow Controls */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border ${priorityInfo.badge}`}
          >
            {priorityInfo.label}
          </span>

          {/* Flow Steppers */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              id={`move-left-${card.id}`}
              disabled={columnIndex === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveCard(card.id, 'left');
              }}
              title="Move left to previous stage"
              className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              id={`move-right-${card.id}`}
              disabled={columnIndex === totalColumns - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMoveCard(card.id, 'right');
              }}
              title="Move right to next stage"
              className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-20 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Title & Description */}
        <div
          onClick={() => onOpenCard(card)}
          className="cursor-pointer space-y-1.5"
        >
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 hover:text-indigo-600 transition">
            {card.title}
          </h3>
          {card.description && (
            <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[11px] font-medium rounded bg-neutral-100 text-neutral-600 border border-neutral-200/70"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Checklist Progress if items exist */}
        {totalChecklist > 0 && (
          <div className="space-y-1 pt-1 border-t border-neutral-100">
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-neutral-400" />
                <span>Checklist</span>
              </span>
              <span className="font-semibold text-neutral-700">
                {completedChecklist}/{totalChecklist}
              </span>
            </div>
            <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  checklistPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer info: Due Date, Assignee, Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            {card.dueDate && (
              <div
                className={`flex items-center gap-1 text-[11px] font-medium ${
                  isOverdue ? 'text-rose-600 font-semibold' : 'text-neutral-500'
                }`}
                title={isOverdue ? 'Task is past due date' : 'Due date'}
              >
                <Calendar className="w-3 h-3" />
                <span>{new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            {card.assignee && (
              <div className="flex items-center gap-1 text-[11px] text-neutral-600" title={`Assignee: ${card.assignee}`}>
                <User className="w-3 h-3 text-neutral-400" />
                <span className="truncate max-w-[80px]">{card.assignee}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenCard(card)}
              className="p-1 text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100 rounded transition"
              title="Edit Card"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteCard(card.id)}
              className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
              title="Delete Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
