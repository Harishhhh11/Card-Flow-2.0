import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Link2,
  Tag as TagIcon,
  Check,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ConnectedSheetInfo, GoogleAccountSpace } from '../../services/googleSheets';

interface AddContactModalProps {
  onClose: () => void;
  onSubmit: (contactData: any, targetEmail?: string, targetSheetId?: string, syncNow?: boolean) => Promise<void>;
  accounts: GoogleAccountSpace[];
  defaultAccountEmail?: string | null;
  defaultSheetId?: string | null;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  onClose,
  onSubmit,
  accounts,
  defaultAccountEmail,
  defaultSheetId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    designation: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    linkedin: '',
    notes: '',
    tags: 'Manual Entry',
  });

  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>(
    defaultAccountEmail || accounts[0]?.email || ''
  );

  const selectedAccountObj =
    accounts.find((a) => a.email.toLowerCase() === selectedAccountEmail.toLowerCase()) || accounts[0];

  const [selectedSheetId, setSelectedSheetId] = useState<string>(
    defaultSheetId || selectedAccountObj?.activeSheetId || selectedAccountObj?.sheets[0]?.id || ''
  );

  const [syncToSheet, setSyncToSheet] = useState<boolean>(accounts.length > 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !formData.company_name) {
      setErrorMsg('Please provide either a contact name or company name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(
        formData,
        selectedAccountEmail,
        selectedSheetId,
        syncToSheet && Boolean(selectedSheetId)
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto border border-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-neutral-900 truncate">Add New CRM Contact</h3>
              <p className="text-xs text-neutral-500 truncate">Record a new lead or business contact</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 font-bold p-1 shrink-0">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Company Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Designation / Role</label>
              <input
                type="text"
                placeholder="e.g. VP of Product"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Mobile Phone</label>
              <input
                type="text"
                placeholder="e.g. +1 555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="e.g. sarah@acmecorp.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Website</label>
              <input
                type="text"
                placeholder="e.g. acmecorp.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">LinkedIn Profile</label>
              <input
                type="text"
                placeholder="e.g. linkedin.com/in/sarah"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Priority, Enterprise"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Physical Address</label>
            <input
              type="text"
              placeholder="e.g. 742 Evergreen Terrace, Springfield, OR"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Notes / CRM Details</label>
            <textarea
              rows={2}
              placeholder="Add conversation notes, deal context, or meeting highlights..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Google Sheets Live Sync Option */}
          {accounts.length > 0 && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncToSheet}
                    onChange={(e) => setSyncToSheet(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500"
                  />
                  <div className="flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">Auto-push to Google Sheets table</span>
                  </div>
                </label>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Live Sync
                </span>
              </div>

              {syncToSheet && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">Gmail Account</label>
                    <select
                      value={selectedAccountEmail}
                      onChange={(e) => {
                        setSelectedAccountEmail(e.target.value);
                        const acc = accounts.find((a) => a.email.toLowerCase() === e.target.value.toLowerCase());
                        setSelectedSheetId(acc?.activeSheetId || acc?.sheets[0]?.id || '');
                      }}
                      className="w-full text-xs bg-white border border-emerald-200 rounded-lg px-2.5 py-1 text-neutral-800 focus:ring-1 focus:ring-emerald-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.email} value={acc.email}>
                          {acc.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-900 mb-0.5">Sheet / Table</label>
                    <select
                      value={selectedSheetId}
                      onChange={(e) => setSelectedSheetId(e.target.value)}
                      className="w-full text-xs bg-white border border-emerald-200 rounded-lg px-2.5 py-1 text-neutral-800 focus:ring-1 focus:ring-emerald-500"
                    >
                      {(selectedAccountObj?.sheets || []).map((sh) => (
                        <option key={sh.id} value={sh.id}>
                          {sh.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              {isSubmitting ? 'Saving Contact...' : 'Save & Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
