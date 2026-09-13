import React from 'react';
import {
  Zap,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Database,
  AlertTriangle,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Ticket } from '../../types';

interface TicketCopilotStudioProps {
  ticket: Ticket;
  isStreaming: boolean;
  streamedText: string;
  streamMeta: {
    ragDoc?: string;
    cached?: boolean;
    piiMasked?: boolean;
  } | null;
  streamError: string | null;
  activeDraft: string | null;
  copiedReply: boolean;
  isApproving: boolean;
  approvalSuccess: boolean;
  feedbackSubmitted: 'thumbs_up' | 'thumbs_down' | null;
  showFeedbackInput: boolean;
  setShowFeedbackInput: (show: boolean) => void;
  feedbackNotes: string;
  setFeedbackNotes: (notes: string) => void;
  onStartStream: () => void;
  onStopStream: () => void;
  onCopyReply: (text: string) => void;
  onApprove: () => void;
  onInsertDraftToComposer: () => void;
  onFeedbackClick: (rating: 'thumbs_up' | 'thumbs_down') => void;
}

export const TicketCopilotStudio: React.FC<TicketCopilotStudioProps> = ({
  ticket,
  isStreaming,
  streamedText,
  streamMeta,
  streamError,
  activeDraft,
  copiedReply,
  isApproving,
  approvalSuccess,
  feedbackSubmitted,
  showFeedbackInput,
  setShowFeedbackInput,
  feedbackNotes,
  setFeedbackNotes,
  onStartStream,
  onStopStream,
  onCopyReply,
  onApprove,
  onInsertDraftToComposer,
  onFeedbackClick,
}) => {
  return (
    <div className="p-5 rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 shadow-md shadow-indigo-100/30 dark:border-cyan-500/30 dark:bg-gradient-to-br dark:from-cyan-950/20 dark:via-slate-900/60 dark:to-purple-950/20 space-y-4 relative overflow-hidden">
      {/* Header Bar: Title + Badges + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-indigo-700 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Zap className={`w-4 h-4 ${isStreaming ? 'animate-bounce text-yellow-300' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 dark:text-slate-100 font-extrabold text-sm tracking-normal capitalize">
                Enterprise AI Copilot
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-mono tracking-wider dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40">
                RAG Grounded
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal normal-case">
              Real-time response synthesizer with PII sanitization & semantic caching
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <button
              onClick={onStopStream}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition shadow-xs dark:bg-rose-600/30 dark:hover:bg-rose-600/50 dark:text-rose-200 dark:border-rose-500/30 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Stop Stream</span>
            </button>
          ) : (
            <button
              onClick={onStartStream}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
              title="Re-generate response token-by-token with real-time vector RAG"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-200" />
              <span>{streamedText ? 'Re-Stream (SSE)' : 'Stream Live Copilot'}</span>
            </button>
          )}

          {activeDraft && (
            <button
              onClick={() => onCopyReply(activeDraft)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 shadow-xs transition cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
              title="Copy current AI reply to clipboard"
            >
              {copiedReply ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedReply ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Guardrails, Engine Source, and Grounding Telemetry Pill Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
        <div
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
            streamMeta?.piiMasked
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>{streamMeta?.piiMasked ? 'PII Guardrail: Masked' : 'PII Guardrail: Clean'}</span>
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
            streamMeta?.cached
              ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40'
              : isStreaming
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/40 animate-pulse'
              : streamedText
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40'
              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>
            {streamMeta?.cached
              ? 'Semantic Cache: Hit (Sub-15ms)'
              : isStreaming
              ? 'Streaming Tokens...'
              : streamedText
              ? 'Engine: Live SSE Streamed'
              : 'Engine: Pre-Computed SOP Draft'}
          </span>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40 font-mono">
          <Database className="w-3 h-3" />
          <span>{streamMeta?.ragDoc || ticket.grounding_doc || 'VOL-I (Vector SOP)'}</span>
        </div>
      </div>

      {/* Active Draft Output Display */}
      {activeDraft || isStreaming ? (
        <div className="p-4 rounded-xl bg-white border border-indigo-100 text-sm text-slate-800 font-sans leading-relaxed relative shadow-xs dark:bg-[#080d18] dark:border-cyan-500/25 dark:text-slate-100 dark:shadow-inner">
          {streamedText || ticket.suggested_reply}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-cyan-500 dark:bg-cyan-400 animate-pulse ml-1 align-middle" />
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 dark:bg-[#080d18]/60 dark:border-slate-800 dark:text-slate-400 flex items-center justify-between">
          <span>
            No suggested reply generated yet. Click{' '}
            <b className="text-slate-800 dark:text-slate-200">"Stream Live Copilot"</b> to synthesize
            a RAG-grounded draft in real time.
          </span>
        </div>
      )}

      {/* Stream Error Alert (if any) */}
      {streamError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 dark:bg-rose-950/40 dark:border-rose-500/40 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>{streamError}</span>
        </div>
      )}

      {/* Action Bar: Adopt to Ticket, Insert to Composer & RLHF Feedback */}
      {activeDraft && (
        <div className="pt-2 border-t border-indigo-100 dark:border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onApprove}
              disabled={isApproving || approvalSuccess}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
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

            <button
              onClick={onInsertDraftToComposer}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition dark:bg-cyan-600/20 dark:hover:bg-cyan-600/30 dark:text-cyan-300 dark:border-cyan-500/40 cursor-pointer"
              title="Paste draft into composer to edit before sending"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
              <span>Edit in Composer</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">RLHF Feedback:</span>
            <button
              onClick={() => onFeedbackClick('thumbs_up')}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                feedbackSubmitted === 'thumbs_up'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                  : 'bg-white text-slate-500 hover:text-emerald-700 border-slate-200 shadow-xs dark:bg-slate-800 dark:text-slate-400 dark:hover:text-emerald-300 dark:border-slate-700'
              }`}
              title="Accurate draft (Thumbs Up)"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowFeedbackInput(!showFeedbackInput)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                feedbackSubmitted === 'thumbs_down'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
                  : 'bg-white text-slate-500 hover:text-rose-700 border-slate-200 shadow-xs dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-300 dark:border-slate-700'
              }`}
              title="Needs improvement (Thumbs Down)"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
            {feedbackSubmitted && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Recorded!
              </span>
            )}
          </div>
        </div>
      )}

      {showFeedbackInput && (
        <div className="pt-2 space-y-2 border-t border-indigo-100 dark:border-slate-800">
          <input
            type="text"
            placeholder="Provide optional correction notes for the AI model..."
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-xs dark:bg-[#090d16] dark:border-slate-800 dark:text-slate-200 dark:placeholder-slate-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowFeedbackInput(false)}
              className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onFeedbackClick('thumbs_down')}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              Submit Correction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
