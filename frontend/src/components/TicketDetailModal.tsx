import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  MessageSquare,
  ShieldCheck,
  User,
  History,
  CornerDownRight,
  AlertTriangle,
} from 'lucide-react';
import { Ticket, TicketStatus, NlpAnalysisResult, TicketMessage, AuditLogItem } from '../types';
import {
  formatDeadline,
  PRIORITY_STYLES,
  CATEGORY_STYLES,
} from '../constants';
import {
  fetchTicketById,
  addTicketMessage,
  assignTicket,
  fetchAuditLogs,
  recordTicketPresence,
} from '../api';
import {
  trackAiDraftApproved,
  trackInternalWhisperAdded,
  trackCollisionDetected,
} from '../lib/telemetry';

const TEAM_MEMBERS = [
  'Unassigned',
  'Sarah Connor (L2 Tech Lead)',
  'Alex Mercer (Billing Specialist)',
  'Elena Rostova (Incident Commander)',
  'Marcus Vance (Security Ops)',
  'Devin Hayes (Support Tier 1)',
];

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

  // Sync state whenever ticket changes & load fresh messages & audit logs
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

    // Initialize messages from ticket or create initial fallback
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

    if (ticket.audit_logs && ticket.audit_logs.length > 0) {
      setAuditLogs(ticket.audit_logs);
    }

    // Fetch freshest data if apiKey provided
    if (apiKey) {
      fetchTicketById(apiKey, ticket.id)
        .then((fresh) => {
          if (fresh.messages && fresh.messages.length > 0) {
            setMessages(fresh.messages);
          }
          if (fresh.audit_logs && fresh.audit_logs.length > 0) {
            setAuditLogs(fresh.audit_logs);
          }
          if (fresh.assigned_to !== undefined) {
            setAssignedTo(fresh.assigned_to || '');
          }
        })
        .catch((err) => {
          console.warn('[TicketDetailModal] Could not fetch fresh thread:', err);
        });
    }
  }, [ticket?.id, apiKey]);

  // Enterprise Fase 2: Real-time agent presence polling for collision detection
  useEffect(() => {
    if (!ticket || !apiKey) return;
    let isMounted = true;

    const sendHeartbeat = async () => {
      try {
        const presenceRes = await recordTicketPresence(
          apiKey,
          ticket.id,
          assignedTo || 'Support Specialist',
        );
        if (isMounted) {
          if (presenceRes.collision_detected && presenceRes.active_agents.length > 0) {
            setCollisionAgents(presenceRes.active_agents);
            trackCollisionDetected(ticket.id, presenceRes.active_agents);
          } else {
            setCollisionAgents([]);
          }
        }
      } catch (pErr) {
        // Non-fatal presence polling
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ticket?.id, apiKey, assignedTo]);

  // Scroll to bottom of conversation thread when new message arrives
  useEffect(() => {
    if (activeTab === 'conversation') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTab]);

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
      trackAiDraftApproved(ticket.id);
      setApprovalSuccess(true);
      setTimeout(() => setApprovalSuccess(false), 3000);
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

  const handleFeedbackClick = async (rating: 'thumbs_up' | 'thumbs_down') => {
    try {
      await onFeedback(rating, feedbackNotes.trim() || undefined);
      setFeedbackSubmitted(rating);
      setShowFeedbackInput(false);
      setFeedbackNotes('');
      setTimeout(() => setFeedbackSubmitted(null), 4000);
      if (apiKey) {
        const freshLogs = await fetchAuditLogs(apiKey, ticket.id);
        setAuditLogs(freshLogs);
      }
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
        sender_name: composerType === 'internal_note' ? 'Staff Specialist' : 'Support Agent',
      });

      setMessages((prev) => [...prev, newMsg]);
      setComposerContent('');

      if (composerType === 'internal_note') {
        trackInternalWhisperAdded(ticket.id);
      }

      // Refresh audit logs
      const freshLogs = await fetchAuditLogs(apiKey, ticket.id);
      setAuditLogs(freshLogs);

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
      const updated = await assignTicket(apiKey, ticket.id, newAssignee === 'Unassigned' ? '' : newAssignee);
      if (onTicketUpdated) onTicketUpdated(updated);
      const freshLogs = await fetchAuditLogs(apiKey, ticket.id);
      setAuditLogs(freshLogs);
    } catch (err: any) {
      alert(`Failed to assign ticket: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700/80 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative">
        {/* Modal Top Bar & Close */}
        <div className="p-5 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              ID: {ticket.id.slice(0, 13)}...
            </span>
            {ticket.priority && (
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${priorityStyle}`}>
                {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
                {ticket.priority}
              </span>
            )}
            {ticket.category && (
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryStyle}`}>
                {ticket.category}
              </span>
            )}
            {ticket.urgency_score !== undefined && ticket.urgency_score !== null && (
              <span className="text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Urgency: {Math.round(ticket.urgency_score * 100)}%
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enterprise Collision Warning Banner */}
        {collisionAgents.length > 0 && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-200 animate-pulse">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-300">Collision Alert:</strong> {collisionAgents.join(', ')} is also viewing/editing this ticket. Coordinate to prevent conflicting responses.
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-amber-500/25 px-2.5 py-0.5 rounded text-amber-300 border border-amber-500/40 shrink-0">
              Live Presence
            </span>
          </div>
        )}

        {/* Header Subject, Assignee & SLA */}
        <div className="px-6 py-4 bg-[#090e1a] border-b border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                {ticket.subject}
              </h2>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>
                  From: <span className="text-slate-200 font-semibold">{ticket.customer_email}</span>
                </span>
                <span>•</span>
                <span>{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Agent Assignment Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-xl shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-slate-400 font-medium">Assignee:</span>
              <select
                value={assignedTo || 'Unassigned'}
                onChange={handleAssigneeChange}
                disabled={isAssigning}
                className="bg-transparent text-xs text-indigo-200 font-semibold focus:outline-none cursor-pointer"
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member} className="bg-slate-900 text-slate-200">
                    {member}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SLA Resolution Target */}
          {ticket.sla_deadline && (
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                ticket.status === 'closed'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : deadlineInfo?.isBreached
                  ? 'bg-rose-950/20 border-rose-500/30'
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
                <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  SLA Resolved
                </span>
              ) : deadlineInfo?.isBreached ? (
                <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[11px]">
                  SLA Breached
                </span>
              ) : (
                <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px]">
                  {deadlineInfo?.text}
                </span>
              )}
            </div>
          )}

          {/* Enterprise Navigation Tabs */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'conversation'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation & Whispers</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {messages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'ai_insights'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>AI & NLP Intelligence</span>
              {ticket.grounding_doc && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit_trail')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'audit_trail'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SOC-2 Audit Trail</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: CONVERSATION & WHISPERS */}
        {activeTab === 'conversation' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Message Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isInternalNote = msg.sender_type === 'internal_note';
                const isCustomer = msg.sender_type === 'customer';
                const isAgent = msg.sender_type === 'agent' || msg.sender_type === 'system';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isInternalNote
                        ? 'items-center'
                        : isCustomer
                        ? 'items-start'
                        : 'items-end'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        {isInternalNote && <Lock className="w-3 h-3 text-amber-400" />}
                        {msg.sender_name}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isInternalNote && (
                        <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                          Team Whisper Only
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isInternalNote
                          ? 'w-full bg-amber-950/20 border-2 border-dashed border-amber-500/40 text-amber-100 rounded-2xl shadow-inner'
                          : isCustomer
                          ? 'bg-[#0b1324] border border-slate-700/80 text-slate-200 rounded-tl-sm shadow-md'
                          : 'bg-indigo-950/40 border border-indigo-500/40 text-indigo-50 rounded-tr-sm shadow-md'
                      }`}
                    >
                      {isInternalNote && (
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1.5 text-[11px] uppercase tracking-wider">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Internal Staff Note (Hidden from Customer)</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Thread Composer */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#090d18] border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setComposerType('agent')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      composerType === 'agent'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Public Reply</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType('internal_note')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      composerType === 'internal_note'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Internal Whisper Note</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  {composerType === 'internal_note'
                    ? '🔒 Only visible to staff members'
                    : '💬 Dispatched to customer email'}
                </span>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={composerContent}
                  onChange={(e) => setComposerContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    composerType === 'internal_note'
                      ? 'Add private technical notes, escalation notes, or staff observations...'
                      : 'Type a multi-turn reply to the customer (Press Ctrl+Enter to send)...'
                  }
                  rows={2}
                  className={`w-full bg-[#0d1424] border rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition resize-none ${
                    composerType === 'internal_note'
                      ? 'border-amber-500/30 focus:border-amber-500'
                      : 'border-indigo-500/30 focus:border-indigo-500'
                  }`}
                />

                <button
                  type="submit"
                  disabled={isSendingMessage || !composerContent.trim()}
                  className={`px-4 py-3 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 disabled:opacity-40 ${
                    composerType === 'internal_note'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {isSendingMessage ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: AI & NLP INTELLIGENCE */}
        {activeTab === 'ai_insights' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* RAG Knowledge Base Grounding Notice */}
            {ticket.grounding_doc && (
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3 text-xs text-indigo-300">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>Anti-Hallucination RAG Grounding Active</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-[10px] font-mono border border-indigo-500/40">
                      {ticket.grounding_doc}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200/80 mt-1">
                    Draft reply was synthesized by grounding against enterprise standard operating procedure ({ticket.grounding_doc}).
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
                    <span className="text-slate-400 text-[11px]">RLHF Quality Feedback:</span>
                    <button
                      onClick={() => handleFeedbackClick('thumbs_up')}
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
                      <span className="text-[11px] text-emerald-400 font-semibold">Recorded!</span>
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
                      {nlpAnalysis.entities.emails?.length > 0 ? nlpAnalysis.entities.emails.join(', ') : 'None detected'}
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
          </div>
        )}

        {/* TAB 3: SOC-2 AUDIT TRAIL */}
        {activeTab === 'audit_trail' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-teal-400">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Immutable Event History (SOC-2 Type II Compliance)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Total Events: {auditLogs.length}
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No audit events recorded yet for this ticket.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {auditLogs.map((log) => {
                  return (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-teal-500/20 border-2 border-teal-400" />
                      <div className="bg-[#0b1220] border border-slate-800/90 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{log.actor_name}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {log.action.replace('_', ' ')}
                          </span>
                          <span className="text-slate-300 text-xs">{log.details}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom: Status Management */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#090d18] border-t border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Ticket Lifecycle:</div>
          <div className="flex items-center gap-2">
            {(['open', 'in_progress', 'closed'] as TicketStatus[]).map((st) => (
              <button
                key={st}
                onClick={async () => {
                  await onStatusUpdate(ticket.id, st);
                  if (apiKey) {
                    const freshLogs = await fetchAuditLogs(apiKey, ticket.id);
                    setAuditLogs(freshLogs);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition ${
                  ticket.status === st
                    ? 'bg-purple-600 text-white shadow-sm'
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
