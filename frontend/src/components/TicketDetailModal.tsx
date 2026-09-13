import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Sparkles, ShieldCheck } from 'lucide-react';
import { Ticket, TicketStatus, NlpAnalysisResult, TicketMessage, AuditLogItem } from '../types';
import {
  fetchTicketById,
  addTicketMessage,
  assignTicket,
  fetchAuditLogs,
  recordTicketPresence,
  streamTicketAiReply,
} from '../api';
import {
  trackAiDraftApproved,
  trackInternalWhisperAdded,
  trackCollisionDetected,
} from '../lib/telemetry';

import { TicketModalHeader } from './ticket-modal/TicketModalHeader';
import { TicketPresenceBanner } from './ticket-modal/TicketPresenceBanner';
import { TicketMessageTimeline } from './ticket-modal/TicketMessageTimeline';
import { TicketMessageComposer } from './ticket-modal/TicketMessageComposer';
import { TicketCopilotStudio } from './ticket-modal/TicketCopilotStudio';
import { TicketNlpCard } from './ticket-modal/TicketNlpCard';
import { TicketAuditTrailTab } from './ticket-modal/TicketAuditTrailTab';
import { TicketLifecycleBar } from './ticket-modal/TicketLifecycleBar';
import {
  TEAM_MEMBERS,
  UNASSIGNED_AGENT,
  DEFAULT_ACTIVE_AGENT_NAME,
  DEFAULT_INTERNAL_WHISPER_SENDER,
  DEFAULT_AGENT_SENDER,
  PRESENCE_POLL_INTERVAL_MS,
  AUTO_DISMISS_NOTIFICATION_MS,
  COPY_FEEDBACK_TIMEOUT_MS,
  FEEDBACK_MODAL_TIMEOUT_MS,
} from '../constants';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  apiKey?: string;
  onClose: () => void;
  onStatusUpdate: (id: string, newStatus: TicketStatus) => Promise<void>;
  onApproveReply: () => Promise<void>;
  onFeedback: (rating: 'thumbs_up' | 'thumbs_down', notes?: string) => Promise<void>;
  onTicketUpdated?: (ticket: Ticket) => void;
  nlpAnalysis: NlpAnalysisResult | null;
  loadingNlp?: boolean;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  apiKey = '',
  onClose,
  onStatusUpdate,
  onApproveReply,
  onFeedback,
  onTicketUpdated,
  nlpAnalysis,
  loadingNlp = false,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'ai_insights' | 'audit_trail'>('conversation');
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [collisionAgents, setCollisionAgents] = useState<string[]>([]);

  // Reply Composer State
  const [composerContent, setComposerContent] = useState('');
  const [composerType, setComposerType] = useState<'agent' | 'internal_note'>('agent');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Approval and RLHF State
  const [isApproving, setIsApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  // Real-time SSE Copilot Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamMeta, setStreamMeta] = useState<{
    ragDoc?: string;
    cached?: boolean;
    piiMasked?: boolean;
  } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const cancelStreamRef = useRef<(() => void) | null>(null);
  const feedbackTimeoutRef = useRef<any>(null);
  const approvalTimeoutRef = useRef<any>(null);
  const copiedTimeoutRef = useRef<any>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (approvalTimeoutRef.current) clearTimeout(approvalTimeoutRef.current);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  // Sync state whenever ticket changes & load fresh messages and audit logs
  useEffect(() => {
    if (!ticket) return;

    setFeedbackSubmitted(null);
    setShowFeedbackInput(false);
    setFeedbackNotes('');
    setApprovalSuccess(false);
    setCopiedReply(false);
    setComposerContent('');
    setComposerType('agent');
    setAssignedTo(ticket.assigned_to || '');

    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    setIsStreaming(false);
    setStreamedText('');
    setStreamMeta(null);
    setStreamError(null);

    if (ticket.messages && ticket.messages.length > 0) {
      setMessages(ticket.messages);
    } else {
      setMessages([
        {
          id: `init-${ticket.id}`,
          ticket_id: ticket.id,
          organization_id: ticket.organization_id,
          sender_type: 'customer',
          sender_name: ticket.customer_email.split('@')[0],
          sender_email: ticket.customer_email,
          content: ticket.message,
          created_at: ticket.created_at,
        },
      ]);
    }

    if (apiKey) {
      fetchTicketById(apiKey, ticket.id)
        .then((fresh) => {
          if (fresh.messages && fresh.messages.length > 0) {
            setMessages(fresh.messages);
          }
          if (fresh.audit_logs) {
            setAuditLogs(fresh.audit_logs);
          }
        })
        .catch((err) => {
          console.warn('[TicketDetailModal] Could not fetch fresh thread:', err);
        });
    }
  }, [ticket?.id, apiKey]);

  // Real-Time Agent Collision Detection
  useEffect(() => {
    if (!ticket?.id || !apiKey) return;
    let isMounted = true;

    const sendHeartbeat = async () => {
      try {
        const agentName =
          assignedTo && assignedTo !== UNASSIGNED_AGENT ? assignedTo : DEFAULT_ACTIVE_AGENT_NAME;
        const presenceRes = await recordTicketPresence(apiKey, ticket.id, agentName);
        if (isMounted) {
          if (presenceRes.collision_detected && presenceRes.active_agents) {
            setCollisionAgents(presenceRes.active_agents);
            trackCollisionDetected(ticket.id, presenceRes.active_agents);
          } else {
            setCollisionAgents([]);
          }
        }
      } catch {
        // Non-fatal presence polling
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, PRESENCE_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ticket?.id, apiKey, assignedTo]);

  // Scroll to bottom of message thread on new message
  useEffect(() => {
    if (activeTab === 'conversation') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTab]);

  const refreshAuditLogs = useCallback(async () => {
    if (!ticket?.id || !apiKey) return;
    try {
      const freshLogs = await fetchAuditLogs(apiKey, ticket.id);
      setAuditLogs(freshLogs);
    } catch {
      // Non-fatal
    }
  }, [ticket?.id, apiKey]);

  if (!ticket) return null;

  const activeDraft = (streamedText || ticket.suggested_reply || '').trim();

  const handleCopyReply = (reply: string) => {
    navigator.clipboard.writeText(reply);
    setCopiedReply(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopiedReply(false), COPY_FEEDBACK_TIMEOUT_MS);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApproveReply();
      trackAiDraftApproved(ticket.id);
      setApprovalSuccess(true);
      if (approvalTimeoutRef.current) clearTimeout(approvalTimeoutRef.current);
      approvalTimeoutRef.current = setTimeout(
        () => setApprovalSuccess(false),
        AUTO_DISMISS_NOTIFICATION_MS,
      );
      if (apiKey) {
        const fresh = await fetchTicketById(apiKey, ticket.id);
        if (fresh.messages) setMessages(fresh.messages);
        if (fresh.audit_logs) setAuditLogs(fresh.audit_logs);
        if (onTicketUpdated) onTicketUpdated(fresh);
      }
    } catch (err: any) {
      alert(`Reply approval failed: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleStartStream = async () => {
    if (!ticket || !apiKey || isStreaming) return;
    setIsStreaming(true);
    setStreamedText('');
    setStreamMeta(null);
    setStreamError(null);

    try {
      const cancel = await streamTicketAiReply(apiKey, ticket.id, {
        onToken: (token) => {
          setStreamedText((prev) => prev + token);
        },
        onDone: (meta) => {
          setIsStreaming(false);
          setStreamMeta({
            ragDoc: meta.ragDoc,
            cached: meta.cached,
            piiMasked: meta.piiMasked,
          });
        },
        onError: (err) => {
          setIsStreaming(false);
          setStreamError(err.message || 'Stream generation failed');
        },
      });

      cancelStreamRef.current = cancel;
    } catch (err: any) {
      setIsStreaming(false);
      setStreamError(err.message || 'Stream initiation failed');
    }
  };

  const handleStopStream = () => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleInsertDraftToComposer = () => {
    if (!activeDraft) return;
    setComposerContent((prev) => (prev ? `${prev}\n\n${activeDraft}` : activeDraft));
    setActiveTab('conversation');
  };

  const handleFeedbackClick = async (rating: 'thumbs_up' | 'thumbs_down') => {
    try {
      await onFeedback(rating, feedbackNotes.trim() || undefined);
      setFeedbackSubmitted(rating);
      setShowFeedbackInput(false);
      setFeedbackNotes('');
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedbackSubmitted(null), FEEDBACK_MODAL_TIMEOUT_MS);
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerContent.trim() || !apiKey) return;

    setIsSendingMessage(true);
    try {
      const newMsg = await addTicketMessage(apiKey, ticket.id, {
        content: composerContent.trim(),
        sender_type: composerType,
        sender_name:
          composerType === 'internal_note' ? DEFAULT_INTERNAL_WHISPER_SENDER : DEFAULT_AGENT_SENDER,
      });

      setMessages((prev) => [...prev, newMsg]);
      setComposerContent('');

      if (composerType === 'internal_note') {
        trackInternalWhisperAdded(ticket.id);
      }

      refreshAuditLogs();

      if (onTicketUpdated) {
        onTicketUpdated({
          ...ticket,
          messages: [...messages, newMsg],
        });
      }
    } catch (err: any) {
      alert(`Message dispatch failed: ${err.message}`);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAssignee = e.target.value;
    setAssignedTo(newAssignee);
    if (!apiKey) return;

    setIsAssigning(true);
    try {
      const updated = await assignTicket(
        apiKey,
        ticket.id,
        newAssignee === UNASSIGNED_AGENT ? '' : newAssignee,
      );
      if (onTicketUpdated) onTicketUpdated(updated);
      refreshAuditLogs();
    } catch (err: any) {
      alert(`Failed to assign ticket: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80 dark:backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden relative">
        <TicketModalHeader
          ticket={ticket}
          assignedTo={assignedTo}
          isAssigning={isAssigning}
          onAssigneeChange={handleAssigneeChange}
          onClose={onClose}
          teamMembers={TEAM_MEMBERS}
        />

        <TicketPresenceBanner collisionAgents={collisionAgents} />

        {/* Header Subject & Segmented Navigation Tabs */}
        <div className="px-5 py-3 bg-white dark:bg-[#090e1a] border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug truncate"
              title={ticket.subject}
            >
              {ticket.subject}
            </h2>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate mt-0.5">
              <span>
                From: <strong className="text-slate-700 dark:text-slate-300 font-mono">{ticket.customer_email}</strong>
              </span>
              <span>•</span>
              <span>{new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/90 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'conversation'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'conversation'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-black/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                {messages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'ai_insights'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  activeTab === 'ai_insights' ? 'text-purple-200' : 'text-purple-500 dark:text-purple-300'
                }`}
              />
              <span>AI Intel</span>
              {ticket.grounding_doc && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit_trail')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'audit_trail'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'audit_trail'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-black/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'conversation' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <TicketMessageTimeline messages={messages} messagesEndRef={messagesEndRef} />
            <TicketMessageComposer
              composerContent={composerContent}
              setComposerContent={setComposerContent}
              composerType={composerType}
              setComposerType={setComposerType}
              isSendingMessage={isSendingMessage}
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              streamedText={streamedText}
              streamMeta={streamMeta}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              onInsertStreamToComposer={handleInsertDraftToComposer}
            />
          </div>
        )}

        {activeTab === 'ai_insights' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <TicketCopilotStudio
              ticket={ticket}
              isStreaming={isStreaming}
              streamedText={streamedText}
              streamMeta={streamMeta}
              streamError={streamError}
              activeDraft={activeDraft}
              copiedReply={copiedReply}
              isApproving={isApproving}
              approvalSuccess={approvalSuccess}
              feedbackSubmitted={feedbackSubmitted}
              showFeedbackInput={showFeedbackInput}
              setShowFeedbackInput={setShowFeedbackInput}
              feedbackNotes={feedbackNotes}
              setFeedbackNotes={setFeedbackNotes}
              onStartStream={handleStartStream}
              onStopStream={handleStopStream}
              onCopyReply={handleCopyReply}
              onApprove={handleApprove}
              onInsertDraftToComposer={handleInsertDraftToComposer}
              onFeedbackClick={handleFeedbackClick}
            />

            <TicketNlpCard nlpAnalysis={nlpAnalysis} loadingNlp={loadingNlp} />
          </div>
        )}

        {activeTab === 'audit_trail' && <TicketAuditTrailTab auditLogs={auditLogs} />}

        <TicketLifecycleBar
          ticket={ticket}
          onStatusUpdate={onStatusUpdate}
          onRefreshAuditLogs={refreshAuditLogs}
        />
      </div>
    </div>
  );
};
