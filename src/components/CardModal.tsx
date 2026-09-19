import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  CheckSquare,
  Plus,
  Trash2,
  Tag as TagIcon,
  Flag,
  Clock,
  Layers,
} from 'lucide-react';
import { FlowCard, FlowColumn, Priority, ChecklistItem } from '../types';
import { INITIAL_TAGS } from '../data/initialData';

interface CardModalProps {
  card: FlowCard | null;
  columns: FlowColumn[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: FlowCard) => void;
  onDelete: (cardId: string) => void;
}

export const CardModal: React.FC<CardModalProps> = ({
  card,
  columns,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !card) return null;

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [columnId, setColumnId] = useState(card.columnId);
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate || '');
  const [assignee, setAssignee] = useState(card.assignee || '');
  const [tags, setTags] = useState<string[]>(card.tags || []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Sync state when card prop changes
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setColumnId(card.columnId);
      setPriority(card.priority);
      setDueDate(card.dueDate || '');
      setAssignee(card.assignee || '');
      setTags(card.tags || []);
      setChecklist(card.checklist || []);
    }
  }, [card]);

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(
      checklist.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleDeleteChecklist = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleToggleTag = (tagName: string) => {
    if (tags.includes(tagName)) {
      setTags(tags.filter((t) => t !== tagName));
    } else {
      setTags([...tags, tagName]);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const updated: FlowCard = {
      ...card,
      title: title.trim(),
      description: (description || '').trim(),
      columnId,
      priority,
      dueDate: dueDate || undefined,
      assignee: assignee.trim() || undefined,
      tags,
      checklist,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="card-modal-container"
        className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Card Details
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              id="card-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title..."
              className="w-full px-3 py-2 text-base font-semibold text-neutral-900 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Quick Selectors Grid: Stage, Priority, Due Date, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Stage / Column */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <Layers className="w-3.5 h-3.5 text-neutral-400" />
                <span>Workflow Stage</span>
              </label>
              <select
                id="card-stage-select"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <Flag className="w-3.5 h-3.5 text-neutral-400" />
                <span>Priority</span>
              </label>
              <select
                id="card-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Due Date</span>
              </label>
              <input
                id="card-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>Assignee</span>
              </label>
              <input
                id="card-assignee-input"
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Assignee name..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              <TagIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INITIAL_TAGS.map((t) => {
                const isSelected = tags.includes(t.name);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleTag(t.name)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="card-description-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context, acceptance criteria, or notes..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white text-neutral-800 leading-relaxed transition"
            />
          </div>

          {/* Checklist / Subtasks */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-neutral-400" />
                <span>Checklist & Subtasks</span>
              </span>
              <span className="text-neutral-500 lowercase font-normal">
                {checklist.filter((i) => i.completed).length} of {checklist.length} done
              </span>
            </label>

            {/* Checklist items list */}
            <div className="space-y-2 mb-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-white transition"
                >
                  <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklist(item.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span
                      className={`text-sm ${
                        item.completed ? 'line-through text-neutral-400' : 'text-neutral-800'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklist(item.id)}
                    className="text-neutral-400 hover:text-rose-600 p-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add checklist item */}
            <form onSubmit={handleAddChecklistItem} className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Add subtask..."
                className="flex-1 px-3 py-1.5 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs rounded-lg border border-neutral-200 transition"
              >
                Add Item
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            id="delete-card-btn"
            onClick={() => {
              if (confirm('Are you sure you want to delete this card?')) {
                onDelete(card.id);
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium text-xs border border-transparent hover:border-rose-200 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Card</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:bg-neutral-200 rounded-lg font-medium text-sm transition"
            >
              Cancel
            </button>
            <button
              id="save-card-btn"
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
