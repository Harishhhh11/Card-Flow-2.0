import React from 'react';
import { Layers, Plus, RotateCcw, Download, Upload, CheckCircle2, Clock } from 'lucide-react';
import { FlowCard } from '../types';

interface NavbarProps {
  cards: FlowCard[];
  onNewCard: () => void;
  onResetData: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cards,
  onNewCard,
  onResetData,
  onExport,
  onImport,
}) => {
  const completedCount = cards.filter(c => c.columnId === 'col-done').length;
  const inProgressCount = cards.filter(c => c.columnId === 'col-progress').length;
  const completionRate = cards.length > 0 ? Math.round((completedCount / cards.length) * 100) : 0;

  return (
    <header id="app-header" className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Card Flow</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-neutral-500 hidden sm:block">Workflow Pipeline & Card Orchestration</p>
            </div>
          </div>

          {/* Quick Flow Metrics */}
          <div className="hidden md:flex items-center gap-6 px-4 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <span className="font-semibold text-neutral-900">{cards.length}</span>
              <span>Total Cards</span>
            </div>
            <div className="h-3 w-px bg-neutral-200" />
            <div className="flex items-center gap-1.5 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-semibold">{inProgressCount}</span>
              <span>In Flight</span>
            </div>
            <div className="h-3 w-px bg-neutral-200" />
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-semibold">{completionRate}%</span>
              <span>Completed</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="export-board-btn"
              onClick={onExport}
              title="Export workspace JSON backup"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-neutral-200"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              id="import-board-btn"
              onClick={onImport}
              title="Import workspace backup"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-neutral-200"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              id="reset-board-btn"
              onClick={onResetData}
              title="Reset to default sample cards"
              className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-neutral-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="add-new-card-btn"
              onClick={onNewCard}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-sm hover:shadow active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">New Card</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
