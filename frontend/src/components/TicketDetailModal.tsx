import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
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
  onFeedback: (rating: 'thumbs_up' | 'thumbs_down', notes?: string) => Promise<void>;
  nlpAnalysis: NlpAnalysisResult | null;
  loadingNlp?: boolean;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onStatusUpdate,
  onApproveReply,
  onFeedback,
  nlpAnalysis,
  loadingNlp = false,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  // Reset internal modal interaction states whenever selected ticket changes
  useEffect(() => {
    setFeedbackSubmitted(null);
    setShowFeedbackInput(false);
    setFeedbackNotes('');
    setApprovalSuccess(false);
    setCopiedReply(false);
  }, [ticket?.id]);

  if (!ticket) return null;

  const deadlineInfo = formatDeadline(ticket.sla_deadline);
  const isCritical = ticket.priority === 'critical';
  const priorityStyle = PRIORITY_STYLES[ticket.priority || 'normal'] || PRIORITY_STYLES.normal;
  const categoryStyle = ticket.category ? CATEGORY_STYLES[ticket.category] || CATEGORY_STYLES.general : '';

  const handleCopyReply = (reply: string) => {
    navigator.clipboard.writeText(reply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApproveReply();
      setApprovalSuccess(true);
      setTimeout(() => setApprovalSuccess(false), 3000);
    } catch (err: any) {
      alert(`Reply approval failed: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleFeedbackClick = async (rating: 'thumbs_up' | 'thumbs_down') => {
    try {
      await onFeedback(rating, feedbackNotes.trim() || undefined);
      setFeedbackSubmitted(rating);
      setShowFeedbackInput(false);
      setFeedbackNotes('');
      setTimeout(() => setFeedbackSubmitted(null), 4000);
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    }
  };

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
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${ticket.status === 'closed'
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : deadlineInfo?.isBreached
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
          >
            <div className="flex items-center gap-2">
              {ticket.status === 'closed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Clock className="w-4 h-4 text-purple-400" />
              )}
              <span className="text-slate-300 font-medium">SLA Resolution Target:</span>
              <span className="font-mono text-purple-200">
                {new Date(ticket.sla_deadline).toLocaleString()}
              </span>
            </div>
            {ticket.status === 'closed' ? (
              <span className="text-emerald-400 font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                SLA Resolved (Closed)
              </span>
            ) : deadlineInfo?.isBreached ? (
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
                onClick={() => handleCopyReply(ticket.suggested_reply!)}
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
                  onClick={handleApprove}
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
                  onClick={() => handleFeedbackClick('thumbs_up')}
                  className={`p-1.5 rounded-lg border transition ${feedbackSubmitted === 'thumbs_up'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-emerald-300 border-slate-700'
                    }`}
                  title="Accurate draft (Thumbs Up)"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowFeedbackInput(!showFeedbackInput)}
                  className={`p-1.5 rounded-lg border transition ${feedbackSubmitted === 'thumbs_down'
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
                onClick={() => handleFeedbackClick('thumbs_down')}
                className="px-3 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold"
              >
                Submit Correction
              </button>
            </div>
          )}
        </div>

        {/* Python NLP Loading State */}
        {loadingNlp && (
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300 animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Analyzing ticket entities & sentiment with Python NLP microservice...</span>
            </div>
            <span className="text-[10px] text-cyan-400/70 font-mono">Python Microservice</span>
          </div>
        )}

        {/* Python NLP Section */}
        {!loadingNlp && nlpAnalysis && (
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> Python NLP Microservice Analysis
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 uppercase">
                  Category: {nlpAnalysis.predicted_category} ({Math.round(nlpAnalysis.confidence * 100)}%)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${
                    nlpAnalysis.urgency === 'high'
                      ? 'bg-rose-950/50 text-rose-300 border-rose-800/40'
                      : nlpAnalysis.urgency === 'medium'
                        ? 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Urgency: {nlpAnalysis.urgency}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] font-medium tracking-wide">EXTRACTED EMAILS</span>
                <span
                  className={
                    nlpAnalysis.entities.emails?.length > 0
                      ? 'text-cyan-300 font-mono font-medium text-[11px] break-all'
                      : 'text-slate-500 italic text-[11px]'
                  }
                >
                  {nlpAnalysis.entities.emails?.length > 0
                    ? nlpAnalysis.entities.emails.join(', ')
                    : 'None detected'}
                </span>
              </div>

              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] font-medium tracking-wide">ORDER / INVOICE IDS</span>
                <span
                  className={
                    nlpAnalysis.entities.invoice_or_order_ids?.length > 0
                      ? 'text-purple-300 font-mono font-medium text-[11px]'
                      : 'text-slate-500 italic text-[11px]'
                  }
                >
                  {nlpAnalysis.entities.invoice_or_order_ids?.length > 0
                    ? nlpAnalysis.entities.invoice_or_order_ids.join(', ')
                    : 'None detected'}
                </span>
              </div>

              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] font-medium tracking-wide">PHONE NUMBERS</span>
                <span
                  className={
                    nlpAnalysis.entities.phone_numbers?.length > 0
                      ? 'text-emerald-300 font-mono font-medium text-[11px]'
                      : 'text-slate-500 italic text-[11px]'
                  }
                >
                  {nlpAnalysis.entities.phone_numbers?.length > 0
                    ? nlpAnalysis.entities.phone_numbers.join(', ')
                    : 'None detected'}
                </span>
              </div>

              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] font-medium tracking-wide">SYSTEM ERROR CODES</span>
                <span
                  className={
                    nlpAnalysis.entities.error_codes?.length > 0
                      ? 'text-rose-300 font-mono font-semibold text-[11px]'
                      : 'text-slate-500 italic text-[11px]'
                  }
                >
                  {nlpAnalysis.entities.error_codes?.length > 0
                    ? nlpAnalysis.entities.error_codes.join(', ')
                    : 'None detected'}
                </span>
              </div>

              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] font-medium tracking-wide">MONETARY AMOUNTS</span>
                <span
                  className={
                    nlpAnalysis.entities.monetary_amounts?.length > 0
                      ? 'text-amber-300 font-mono font-medium text-[11px]'
                      : 'text-slate-500 italic text-[11px]'
                  }
                >
                  {nlpAnalysis.entities.monetary_amounts?.length > 0
                    ? nlpAnalysis.entities.monetary_amounts.join(', ')
                    : 'None detected'}
                </span>
              </div>

              <div className="bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] font-medium tracking-wide">SENTIMENT POLARITY</span>
                <span className="text-slate-300 font-medium text-[11px] capitalize">
                  {nlpAnalysis.sentiment_hint || 'neutral'}
                </span>
              </div>
            </div>

            {nlpAnalysis.summary && (
              <div className="text-[11px] text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60 flex items-center justify-between">
                <span>
                  <strong className="text-slate-300 font-medium">Pipeline Summary:</strong> {nlpAnalysis.summary}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Python Microservice</span>
              </div>
            )}
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition ${ticket.status === st
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
