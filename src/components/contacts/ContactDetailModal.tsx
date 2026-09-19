import React, { useState } from 'react';
import {
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Link2,
  FileSpreadsheet,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  Trash2,
  GitPullRequest,
  Check,
  Calendar,
  Tag as TagIcon,
  ScanLine,
} from 'lucide-react';
import { Contact, Lead } from '../../types';
import { api } from '../../services/api';
import { ConnectedSheetInfo, GoogleAccountSpace } from '../../services/googleSheets';
import { useTheme } from '../../context/ThemeContext';

interface ContactDetailModalProps {
  contact: Contact;
  onClose: () => void;
  onUpdateContact: (updated: Contact) => void;
  onDeleteContact: (id: string) => void;
  onLeadCreated?: (lead: Lead) => void;
  accounts: GoogleAccountSpace[];
  onSyncContactToSheet?: (contact: Contact, targetEmail?: string, targetSheetId?: string) => Promise<boolean>;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  onClose,
  onUpdateContact,
  onDeleteContact,
  onLeadCreated,
  accounts,
  onSyncContactToSheet,
}) => {
  const { isLight } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isConvertingLead, setIsConvertingLead] = useState(false);

  // Editable form state
  const [formData, setFormData] = useState({
    name: contact.name || '',
    company_name: contact.company_name || '',
    designation: contact.designation || '',
    phone: contact.mobile_numbers.join(', ') || '',
    email: contact.email_addresses.join(', ') || '',
    website: contact.website || '',
    address: contact.address || '',
    linkedin: contact.linkedin || '',
    notes: contact.notes || contact.other_details || '',
    tags: contact.tags.join(', ') || '',
  });

  // Selected Target Sheet for Manual Push
  const [targetAccountEmail, setTargetAccountEmail] = useState<string>(
    contact.synced_account_email || accounts[0]?.email || ''
  );
  const selectedAccountObj = accounts.find((a) => a.email.toLowerCase() === targetAccountEmail.toLowerCase()) || accounts[0];
  const [targetSheetId, setTargetSheetId] = useState<string>(
    contact.synced_sheet_id || selectedAccountObj?.activeSheetId || selectedAccountObj?.sheets[0]?.id || ''
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.updateContact(contact.id, {
        name: formData.name,
        company_name: formData.company_name,
        designation: formData.designation,
        mobile_numbers: formData.phone.split(',').map((s) => s.trim()).filter(Boolean),
        email_addresses: formData.email.split(',').map((s) => s.trim()).filter(Boolean),
        website: formData.website,
        address: formData.address,
        linkedin: formData.linkedin,
        notes: formData.notes,
        tags: formData.tags.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onUpdateContact(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToSheet = async () => {
    if (!onSyncContactToSheet) return;
    setIsSyncing(true);
    try {
      const ok = await onSyncContactToSheet(contact, targetAccountEmail, targetSheetId);
      if (ok) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to push contact to sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConvertToLead = async () => {
    setIsConvertingLead(true);
    try {
      const lead = await api.convertContactToLead(contact.id, {
        deal_value: 5000,
        priority: 'MEDIUM',
        notes: `Converted from contact ${contact.name} (${contact.company_name})`,
      });
      if (onLeadCreated) onLeadCreated(lead);
      alert(`Successfully created Lead opportunity for ${contact.name}!`);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to convert contact to lead');
    } finally {
      setIsConvertingLead(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div
        className={`rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto border transition-all ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-300/50'
            : 'bg-slate-950 border-cyan-500/30 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.25)]'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-start justify-between border-b pb-3 sm:pb-4 gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white flex items-center justify-center font-extrabold text-base sm:text-lg shadow-md shrink-0">
              {contact.name ? contact.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className={`text-sm sm:text-base font-extrabold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {contact.name || 'Unnamed Contact'}
                </h3>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 ${
                    contact.source === 'CARD_SCAN'
                      ? isLight
                        ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-300'
                      : 'bg-slate-850 text-slate-400 border border-slate-700'
                  }`}
                >
                  {contact.source === 'CARD_SCAN' && <ScanLine className="w-2.5 h-2.5 text-cyan-500" />}
                  <span>{contact.source === 'CARD_SCAN' ? 'Card OCR' : contact.source.replace('_', ' ')}</span>
                </span>
              </div>
              <p className={`text-xs mt-0.5 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {contact.company_name} {contact.designation ? `• ${contact.designation}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer border ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-750'
              }`}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Google Sheets Linking Panel */}
        <div className={`p-3 sm:p-3.5 border rounded-xl space-y-2 shadow-xs ${
          isLight
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-slate-900/90 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-extrabold block truncate ${isLight ? 'text-emerald-950' : 'text-slate-100'}`}>
                  Google Sheets Sync & Destination
                </span>
                <p className={`text-[10px] truncate ${isLight ? 'text-emerald-800 font-semibold' : 'text-emerald-400'}`}>
                  Link or push this contact directly into your Google Sheets tables
                </p>
              </div>
            </div>

            {contact.synced_to_sheets ? (
              <span className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-auto border ${
                isLight ? 'bg-emerald-200 text-emerald-950 border-emerald-400' : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              }`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Synced in Sheets</span>
              </span>
            ) : (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 self-start sm:self-auto border ${
                isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              }`}>
                Local CRM Record
              </span>
            )}
          </div>

          {accounts.length > 0 ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t ${isLight ? 'border-emerald-200' : 'border-slate-800'}`}>
              <div>
                <label className={`block text-[10px] font-bold mb-0.5 ${isLight ? 'text-emerald-900' : 'text-slate-300'}`}>
                  Target Gmail Account
                </label>
                <select
                  value={targetAccountEmail}
                  onChange={(e) => {
                    setTargetAccountEmail(e.target.value);
                    const acc = accounts.find((a) => a.email.toLowerCase() === e.target.value.toLowerCase());
                    setTargetSheetId(acc?.activeSheetId || acc?.sheets[0]?.id || '');
                  }}
                  className={`w-full text-xs border rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-750 text-slate-200'
                  }`}
                >
                  {accounts.map((acc) => (
                    <option key={acc.email} value={acc.email}>
                      {acc.email} ({acc.sheets.length} Sheets)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-0.5 ${isLight ? 'text-emerald-900' : 'text-slate-300'}`}>
                  Target Sheet / Table
                </label>
                <div className="flex space-x-1.5">
                  <select
                    value={targetSheetId}
                    onChange={(e) => setTargetSheetId(e.target.value)}
                    className={`flex-1 text-xs border rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-750 text-slate-200'
                    }`}
                  >
                    {(selectedAccountObj?.sheets || []).map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.title}
                      </option>
                    ))}
                    {(selectedAccountObj?.sheets || []).length === 0 && (
                      <option value="">No sheets created yet</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handlePushToSheet}
                    disabled={isSyncing}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold flex items-center space-x-1 shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isSyncing ? 'Pushing...' : syncSuccess ? 'Synced!' : 'Push Row'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex items-center justify-between pt-2 border-t ${isLight ? 'border-emerald-200' : 'border-slate-800'}`}>
              <p className={`text-xs ${isLight ? 'text-emerald-900 font-medium' : 'text-slate-400'}`}>
                Connect your Google account to sync this contact to Google Sheets.
              </p>
              <button
                type="button"
                onClick={handlePushToSheet}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold flex items-center space-x-1.5 shrink-0 shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Connecting...' : 'Connect & Sync to Sheet'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Form / Details View */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number(s)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +1 555-0199, +1 555-0188"
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address(es)</label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. contact@example.com"
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Website URL</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g. https://company.com"
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="e.g. linkedin.com/in/username"
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Physical Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Notes & Conversation History</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-750 text-slate-100 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                {isSaving ? 'Saving Changes...' : 'Save Updates'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contact.email_addresses[0] && (
                <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <div className="overflow-hidden">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Email Address</span>
                    <a
                      href={`mailto:${contact.email_addresses[0]}`}
                      className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline truncate block"
                    >
                      {contact.email_addresses.join(', ')}
                    </a>
                  </div>
                </div>
              )}

              {contact.mobile_numbers[0] && (
                <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Phone Number</span>
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      {contact.mobile_numbers.join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {contact.website && (
                <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <div className="overflow-hidden">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Website</span>
                    <a
                      href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-xs font-semibold truncate block ${isLight ? 'text-slate-800 hover:text-cyan-600' : 'text-slate-200 hover:text-cyan-400'}`}
                    >
                      {contact.website}
                    </a>
                  </div>
                </div>
              )}

              {contact.linkedin && (
                <div className={`p-3 rounded-xl border flex items-center space-x-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="overflow-hidden">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>LinkedIn</span>
                    <a
                      href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                    >
                      {contact.linkedin}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {contact.address && (
              <div className={`p-3 rounded-xl border flex items-start space-x-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
              }`}>
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Physical Address</span>
                  <p className={`text-xs font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{contact.address}</p>
                </div>
              </div>
            )}

            {(contact.notes || contact.other_details) && (
              <div className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  Notes & Details
                </span>
                <p className={`text-xs leading-relaxed whitespace-pre-wrap font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  {contact.notes || contact.other_details}
                </p>
              </div>
            )}

            {/* Tags & Metadata */}
            <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px] ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center space-x-1.5">
                <TagIcon className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isLight
                          ? 'bg-slate-100 text-cyan-800 border-cyan-300'
                          : 'bg-slate-800 text-cyan-300 border-cyan-500/20'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`flex items-center space-x-1 text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                <Calendar className="w-3 h-3" />
                <span>Added: {new Date(contact.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Operations */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onDeleteContact(contact.id);
            }}
            className="px-3 py-1.5 text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-[0_0_8px_rgba(244,63,94,0.2)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Contact</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleConvertToLead}
              disabled={isConvertingLead}
              className="px-3 py-1.5 bg-indigo-950/60 border border-indigo-500/40 hover:bg-indigo-900/60 text-indigo-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.2)]"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isConvertingLead ? 'Creating Lead...' : 'Convert to CRM Lead'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
