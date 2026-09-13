import React, { useState } from 'react';
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
  onSubmit: (ticketData: {
    customer_email: string;
    subject: string;
    message: string;
  }) => Promise<void>;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  tenantName,
  onSubmit,
}) => {
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        customer_email: customerEmail,
        subject,
        message,
      });
      // Clear form inputs on success
      setCustomerEmail('');
      setSubject('');
      setMessage('');
      onClose();
    } catch {
      // Error handling is managed by onSubmit / caller
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomerEmail('');
    setSubject('');
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="double-bezel w-full max-w-lg shadow-2xl">
        <div className="double-bezel-inner p-6 sm:p-7 space-y-5 relative">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2.5 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <TicketIcon className="w-4 h-4" />
              </div>
              <span>Create Support Ticket</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Target Organization: <span className="text-purple-300 font-bold">{tenantName}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer Email</label>
              <input
                type="email"
                required
                placeholder="e.g. user@customer.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. 504 Gateway Timeout on Production API"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message Description</label>
              <textarea
                required
                rows={4}
                placeholder="Describe the issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-200 flex items-start gap-2.5 shadow-sm">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <strong className="text-purple-300">Enterprise AI Pipeline:</strong> Semantic Redis cache check &rarr; RAG SOP Grounding &rarr; Urgency & SLA calculation &rarr; Suggested reply draft.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 pl-4 pr-2.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all hover:-translate-y-0.5 active:scale-95 group disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Classifying & Grounding...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Ticket</span>
                    <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-105 group-hover:bg-white/30 transition-transform">
                      <Send className="w-3 h-3 text-white" />
                    </div>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
