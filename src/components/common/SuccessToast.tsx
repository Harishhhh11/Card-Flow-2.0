import React, { useEffect } from 'react';
import { CheckCircle2, X, FileSpreadsheet, Users } from 'lucide-react';

interface SuccessToastProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  contactName?: string;
  syncedToSheets?: boolean;
  syncedSheetLabel?: string;
  duration?: number; // default 2500ms
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  show,
  onClose,
  title = 'Contact saved successfully',
  message = 'Contact saved to CRM and ready for follow-up.',
  contactName,
  syncedToSheets = false,
  syncedSheetLabel,
  duration = 2600,
}) => {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div
      id="contact-save-success-popup"
      role="alert"
      className="fixed top-5 right-5 z-50 max-w-sm w-full cyber-panel bg-slate-950/95 border border-emerald-500/50 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md p-4 transition-all duration-300 animate-in slide-in-from-top-4 fade-in"
    >
      <div className="flex items-start space-x-3">
        {/* Success Icon */}
        <div className="w-9 h-9 rounded-full bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-xs font-bold text-slate-100 tracking-tight flex items-center space-x-1.5">
            <span>{title}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
          </h4>
          {contactName && (
            <p className="text-xs font-semibold text-emerald-400 mt-0.5 truncate">
              {contactName}
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-0.5">
            {message}
          </p>

          {syncedToSheets && (
            <div className="mt-2 inline-flex items-center space-x-1 text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md max-w-full truncate shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">
                {syncedSheetLabel ? `Saved to: ${syncedSheetLabel}` : 'Mirrored to Google Sheets'}
              </span>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2-3 Second Countdown Progress Line */}
      <div className="mt-3 w-full bg-slate-900 rounded-full h-1 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] transition-all ease-linear"
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        ></div>
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
