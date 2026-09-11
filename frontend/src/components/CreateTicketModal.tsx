import React from 'react';
import {
  X,
  Ticket as TicketIcon,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantName: string;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  customerEmail: string;
  setCustomerEmail: (email: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  message: string;
  setMessage: (message: string) => void;
  isSubmitting: boolean;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  tenantName,
  onSubmit,
  customerEmail,
  setCustomerEmail,
  subject,
  setSubject,
  message,
  setMessage,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-purple-400" />
            <span>Create Support Ticket</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Organization: <span className="text-purple-300 font-semibold">{tenantName}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Email</label>
            <input
              type="email"
              required
              placeholder="e.g. user@customer.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. 504 Gateway Timeout on Production API"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Message Description</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the issue in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>AI Pipeline:</strong> Semantic Redis cache check &rarr; RAG SOP Grounding &rarr; Urgency & SLA calculation &rarr; Suggested reply draft.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Classifying & Grounding...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
