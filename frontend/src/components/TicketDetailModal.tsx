import React from 'react';
import {
  X,
  Flame,
  Clock,
  FileText,
  Sparkles,
  Check,
  Copy,
  Send,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Cpu,
} from 'lucide-react';
import { Ticket, TicketStatus, NlpAnalysisResult } from '../types';
import {
  formatDeadline,
  PRIORITY_STYLES,
  CATEGORY_STYLES,
} from '../constants';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onStatusUpdate: (id: string, newStatus: TicketStatus) => Promise<void>;
  onApproveReply: () => Promise<void>;
  isApproving: boolean;
  approvalSuccess: boolean;
  onFeedback: (rating: 'thumbs_up' | 'thumbs_down') => Promise<void>;
  feedbackSubmitted: 'thumbs_up' | 'thumbs_down' | null;
  feedbackNotes: string;
  setFeedbackNotes: (notes: string) => void;
  showFeedbackInput: boolean;
  setShowFeedbackInput: (show: boolean) => void;
  copiedReply: boolean;
  onCopyReply: (reply: string) => void;
  nlpAnalysis: NlpAnalysisResult | null;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onStatusUpdate,
  onApproveReply,
  isApproving,
  approvalSuccess,
  onFeedback,
  feedbackSubmitted,
  feedbackNotes,
  setFeedbackNotes,
  showFeedbackInput,
  setShowFeedbackInput,
  copiedReply,
  onCopyReply,
  nlpAnalysis,
}) => {
  if (!ticket) return null;

  const deadlineInfo = formatDeadline(ticket.sla_deadline);
  const isCritical = ticket.priority === 'critical';
  const priorityStyle = PRIORITY_STYLES[ticket.priority || 'normal'] || PRIORITY_STYLES.normal;
  const categoryStyle = ticket.category ? CATEGORY_STYLES[ticket.category] || CATEGORY_STYLES.general : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl p-6 space-y-6 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Smart Triage Summary */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">Ticket ID: {ticket.id}</span>
            {ticket.priority && (
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${priorityStyle}`}>
                {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
                Priority: {ticket.priority}
              </span>
            )}
            {ticket.category && (
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryStyle}`}>
                {ticket.category}
              </span>
            )}
            {ticket.urgency_score !== undefined && ticket.urgency_score !== null && (
              <span className="text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Urgency: {Math.round(ticket.urgency_score * 100)}/100
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">{ticket.subject}</h2>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>
              From: <span className="text-slate-200 font-semibold">{ticket.customer_email}</span>
            </span>
            <span>•</span>
            <span>{new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* SLA Target Banner */}
        {ticket.sla_deadline && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 font-medium">SLA Resolution Target:</span>
              <span className="font-mono text-purple-200">
                {new Date(ticket.sla_deadline).toLocaleString()}
              </span>
            </div>
            {deadlineInfo?.isBreached ? (
              <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                SLA Breached
              </span>
            ) : (
              <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                {deadlineInfo?.text}
              </span>
            )}
          </div>
        )}

        {/* Customer Message Card */}
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Customer Message</span>
            {ticket.sentiment && (
              <span className="capitalize text-slate-300 font-medium">
                Sentiment: {ticket.sentiment}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {ticket.message}
          </p>
        </div>

        {/* RAG Knowledge Base Grounding Notice */}
        {ticket.grounding_doc && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-2.5 text-xs text-indigo-300">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>Anti-Hallucination RAG Grounding Active</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-[10px] font-mono border border-indigo-500/40">
                  {ticket.grounding_doc}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/70 mt-0.5">
                Draft reply was synthesized by grounding against official enterprise standard operating procedure ({ticket.grounding_doc}).
              </p>
            </div>
          </div>
        )}

        {/* LLM Suggested Reply Section + HITL Approval & Feedback */}
        <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Suggested Reply (RAG-Grounded Draft)</span>
            </div>
            {ticket.suggested_reply && (
              <button
                onClick={() => onCopyReply(ticket.suggested_reply!)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg transition"
              >
                {copiedReply ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReply ? 'Copied!' : 'Copy Draft'}</span>
              </button>
            )}
          </div>

          {ticket.suggested_reply ? (
            <p className="text-sm text-slate-100 bg-[#090d16]/70 p-3.5 rounded-xl border border-purple-500/20 leading-relaxed font-sans">
              {ticket.suggested_reply}
            </p>
          ) : (
            <div className="text-xs text-slate-500 italic">No suggested reply generated for this ticket.</div>
          )}

          {/* Human-in-the-Loop (HITL) Action Bar */}
          {ticket.suggested_reply && (
            <div className="pt-2 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={onApproveReply}
                  disabled={isApproving || approvalSuccess}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {approvalSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approved & Adopted!</span>
                    </>
                  ) : isApproving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Adopting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Approve & Adopt Draft Reply</span>
                    </>
                  )}
                </button>
              </div>

              {/* RLHF Thumbs Up / Down */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">AI Quality Feedback:</span>
                <button
                  onClick={() => onFeedback('thumbs_up')}
                  className={`p-1.5 rounded-lg border transition ${
                    feedbackSubmitted === 'thumbs_up'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-emerald-300 border-slate-700'
                  }`}
                  title="Accurate draft (Thumbs Up)"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                  className={`p-1.5 rounded-lg border transition ${
                    feedbackSubmitted === 'thumbs_down'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-rose-300 border-slate-700'
                  }`}
                  title="Needs improvement (Thumbs Down)"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                {feedbackSubmitted && (
                  <span className="text-[11px] text-emerald-400 font-semibold animate-fade-in">
                    Recorded!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Optional human correction input */}
          {showFeedbackInput && (
            <div className="pt-2 space-y-2">
              <input
                type="text"
                placeholder="Provide optional correction notes for the AI model..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => onFeedback('thumbs_down')}
                className="px-3 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold"
              >
                Submit Correction
              </button>
            </div>
          )}
        </div>

        {/* Python NLP Section */}
        {nlpAnalysis && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> Python NLP Microservice Analysis (Bonus)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Category: {nlpAnalysis.predicted_category} ({Math.round(nlpAnalysis.confidence * 100)}%)
              </span>
            </div>
            <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 mt-2">
              <div className="bg-black/30 p-2 rounded-lg">
                <span className="text-slate-500 block text-[10px]">EXTRACTED EMAILS</span>
                {nlpAnalysis.entities.emails.length > 0 ? nlpAnalysis.entities.emails.join(', ') : 'None detected'}
              </div>
              <div className="bg-black/30 p-2 rounded-lg">
                <span className="text-slate-500 block text-[10px]">ORDER / INVOICE IDS</span>
                {nlpAnalysis.entities.invoice_or_order_ids.length > 0 ? nlpAnalysis.entities.invoice_or_order_ids.join(', ') : 'None detected'}
              </div>
            </div>
          </div>
        )}

        {/* Status Management */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">Change Status:</div>
          <div className="flex items-center gap-2">
            {(['open', 'in_progress', 'closed'] as TicketStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => onStatusUpdate(ticket.id, st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition ${
                  ticket.status === st
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
