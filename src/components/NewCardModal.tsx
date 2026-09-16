import React, { useState, useEffect } from 'react';
import { X, Layers, Flag, Calendar, User, Tag as TagIcon, Plus, Trash2 } from 'lucide-react';
import { FlowCard, FlowColumn, Priority, ChecklistItem } from '../types';
import { INITIAL_TAGS } from '../data/initialData';

interface NewCardModalProps {
  isOpen: boolean;
  defaultColumnId: string;
  columns: FlowColumn[];
  onClose: () => void;
  onCreateCard: (newCard: Omit<FlowCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const NewCardModal: React.FC<NewCardModalProps> = ({
  isOpen,
  defaultColumnId,
  columns,
  onClose,
  onCreateCard,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || 'col-backlog');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistInput, setChecklistInput] = useState('');

  useEffect(() => {
    if (defaultColumnId) {
      setColumnId(defaultColumnId);
    }
  }, [defaultColumnId]);

  const handleToggleTag = (tagName: string) => {
    if (tags.includes(tagName)) {
      setTags(tags.filter((t) => t !== tagName));
    } else {
      setTags([...tags, tagName]);
    }
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistInput.trim()) return;
    setChecklist([
      ...checklist,
      {
        id: `chk-${Date.now()}`,
        text: checklistInput.trim(),
        completed: false,
      },
    ]);
    setChecklistInput('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateCard({
      title: title.trim(),
      description: description.trim(),
      columnId,
      priority,
      dueDate: dueDate || undefined,
      assignee: assignee.trim() || undefined,
      tags,
      checklist,
    });

    // Reset fields
    setTitle('');
    setDescription('');
    setTags([]);
    setChecklist([]);
    setDueDate('');
    setAssignee('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-neutral-900">Create New Card</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Card Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Card Title *
            </label>
            <input
              id="new-card-title-input"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication workflow"
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          {/* Target Stage & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <Layers className="w-3.5 h-3.5 text-neutral-400" />
                <span>Workflow Stage</span>
              </label>
              <select
                id="new-card-stage-select"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <Flag className="w-3.5 h-3.5 text-neutral-400" />
                <span>Priority</span>
              </label>
              <select
                id="new-card-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              id="new-card-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be accomplished?"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white text-sm transition"
            />
          </div>

          {/* Due Date & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Due Date</span>
              </label>
              <input
                id="new-card-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span>Assignee</span>
              </label>
              <input
                id="new-card-assignee-input"
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Assignee name..."
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              <TagIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INITIAL_TAGS.map((t) => {
                const isSelected = tags.includes(t.name);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleTag(t.name)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial Checklist */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Subtasks
            </label>
            <div className="space-y-1.5 mb-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs p-1.5 bg-neutral-50 rounded border border-neutral-200"
                >
                  <span className="text-neutral-700">{item.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="text-neutral-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                placeholder="Add subtask and press enter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-2.5 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg border border-neutral-200"
              >
                Add
              </button>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-medium text-sm transition"
            >
              Cancel
            </button>
            <button
              id="submit-new-card-btn"
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition shadow-sm"
            >
              Create Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
