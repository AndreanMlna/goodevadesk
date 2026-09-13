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
  Zap,
  Database,
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
  streamTicketAiReply,
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

  // Enterprise Fase 3: Real-time SSE Copilot Streaming
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

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (approvalTimeoutRef.current) clearTimeout(approvalTimeoutRef.current);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

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

    // Reset streaming state
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    setIsStreaming(false);
    setStreamedText('');
    setStreamMeta(null);
    setStreamError(null);

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
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopiedReply(false), 2000);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApproveReply();
      trackAiDraftApproved(ticket.id);
      setApprovalSuccess(true);
      if (approvalTimeoutRef.current) clearTimeout(approvalTimeoutRef.current);
      approvalTimeoutRef.current = setTimeout(() => setApprovalSuccess(false), 3000);
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

  // Enterprise Fase 3: Real-time SSE Copilot Streaming Handlers
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

  const activeDraft = (streamedText || ticket.suggested_reply || '').trim();

  const handleInsertDraftToComposer = () => {
    if (!activeDraft) return;
    setComposerContent((prev) => (prev ? `${prev}\n\n${activeDraft}` : activeDraft));
    setActiveTab('conversation');
  };

  const handleInsertStreamToComposer = handleInsertDraftToComposer;

  const handleFeedbackClick = async (rating: 'thumbs_up' | 'thumbs_down') => {
    try {
      await onFeedback(rating, feedbackNotes.trim() || undefined);
      setFeedbackSubmitted(rating);
      setShowFeedbackInput(false);
      setFeedbackNotes('');
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedbackSubmitted(null), 4000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden relative">
        {/* Modal Top Metadata Bar & Controls */}
        <div className="px-5 py-3 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 shrink-0">
              ID: {ticket.id.slice(0, 13)}...
            </span>
            {ticket.priority && (
              <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${priorityStyle}`}>
                {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
                {ticket.priority}
              </span>
            )}
            {ticket.category && (
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border shrink-0 ${categoryStyle}`}>
                {ticket.category}
              </span>
            )}
            {ticket.urgency_score !== undefined && ticket.urgency_score !== null && (
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                Urgency: {Math.round(ticket.urgency_score * 100)}%
              </span>
            )}
            {ticket.sla_deadline && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono shrink-0 ${
                  ticket.status === 'closed'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                    : deadlineInfo?.isBreached
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
                title={`SLA Resolution Target: ${new Date(ticket.sla_deadline).toLocaleString()}`}
              >
                <Clock className="w-3 h-3 text-purple-400 shrink-0" />
                <span>{ticket.status === 'closed' ? 'SLA Resolved' : deadlineInfo?.isBreached ? 'SLA Breached' : deadlineInfo?.text}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Compact Assignee Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
              <User className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Assignee:</span>
              <select
                value={assignedTo || 'Unassigned'}
                onChange={handleAssigneeChange}
                disabled={isAssigning}
                className="bg-transparent text-[11px] text-indigo-200 font-semibold focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member} className="bg-slate-900 text-slate-200">
                    {member}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enterprise Collision Warning Banner */}
        {collisionAgents.length > 0 && (
          <div className="mx-5 mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-200 animate-pulse shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-300">Collision Alert:</strong> {collisionAgents.join(', ')} is also viewing this ticket.
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-amber-500/25 px-2 py-0.5 rounded text-amber-300 border border-amber-500/40 shrink-0">
              Live Presence
            </span>
          </div>
        )}

        {/* Header Subject & Segmented Navigation Tabs */}
        <div className="px-5 py-3 bg-[#090e1a] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate" title={ticket.subject}>
              {ticket.subject}
            </h2>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate mt-0.5">
              <span>From: <strong className="text-slate-300 font-mono">{ticket.customer_email}</strong></span>
              <span>•</span>
              <span>{new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Compact Segmented Navigation Tabs */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('conversation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === 'conversation'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {messages.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === 'ai_insights'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>AI Intel</span>
              {ticket.grounding_doc && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit_trail')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === 'audit_trail'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: CONVERSATION & WHISPERS (EXPANDED TO DOMINATE MODAL SPACE) */}
        {activeTab === 'conversation' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Message Timeline with Generous Space */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isInternalNote = msg.sender_type === 'internal_note';
                const isCustomer = msg.sender_type === 'customer';

                if (isInternalNote) {
                  return (
                    <div key={msg.id} className="w-full flex flex-col items-center my-1.5 animate-fadeIn">
                      <div className="w-full max-w-2xl bg-amber-950/20 border border-amber-500/35 rounded-xl p-3 text-xs text-amber-100 shadow-sm">
                        <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold mb-1 pb-1 border-b border-amber-500/20">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            <span className="uppercase tracking-wider text-[10px] font-bold">Team Whisper</span>
                            <span className="text-amber-300/80 font-normal">({msg.sender_name})</span>
                          </div>
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-amber-100/90 leading-relaxed font-sans">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isCustomer ? 'items-start' : 'items-end ml-auto'
                    } max-w-[85%] sm:max-w-[78%] animate-fadeIn`}
                  >
                    {/* Message Header Info */}
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                      <span className={`font-semibold ${isCustomer ? 'text-slate-300' : 'text-indigo-300'}`}>
                        {msg.sender_name}
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed shadow-sm ${
                        isCustomer
                          ? 'bg-[#0b1324] border border-slate-700/70 text-slate-100 rounded-tl-sm'
                          : 'bg-indigo-950/40 border border-indigo-500/40 text-indigo-50 rounded-tr-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Streamlined Thread Composer */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-[#090d18] border-t border-slate-800 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setComposerType('agent')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      composerType === 'agent'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <CornerDownRight className="w-3 h-3" />
                    <span>Public Reply</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType('internal_note')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      composerType === 'internal_note'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-amber-300" />
                    <span>Internal Whisper</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartStream}
                    disabled={isStreaming}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/40 text-cyan-200 hover:from-cyan-600/50 hover:to-blue-600/50 transition font-semibold disabled:opacity-50 cursor-pointer"
                    title="Stream real-time AI reply draft with PII protection"
                  >
                    <Zap className={`w-3 h-3 text-cyan-400 ${isStreaming ? 'animate-bounce' : ''}`} />
                    <span>{isStreaming ? 'Streaming...' : 'Stream AI Copilot'}</span>
                  </button>
                  <span className="text-[10px] text-slate-500 hidden md:inline-flex items-center gap-1">
                    {composerType === 'internal_note' ? (
                      <>
                        <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span>Staff only</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                        <span>Sends to email</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Compact Copilot Streaming Preview Banner */}
              {(isStreaming || (streamedText && composerContent !== streamedText)) && (
                <div className="p-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-xs space-y-1 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                      <Zap className={`w-3 h-3 text-cyan-400 ${isStreaming ? 'animate-spin' : ''}`} />
                      <span>{isStreaming ? 'AI Streaming (SSE)...' : 'AI Copilot Draft'}</span>
                      {streamMeta?.cached && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-[9px] text-cyan-300 border border-cyan-500/40">
                          Cache Hit
                        </span>
                      )}
                      {streamMeta?.piiMasked && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[9px] text-amber-300 border border-amber-500/40">
                          PII Masked
                        </span>
                      )}
                    </div>
                    <div>
                      {isStreaming ? (
                        <button
                          type="button"
                          onClick={handleStopStream}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] border border-rose-500/30 cursor-pointer"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleInsertStreamToComposer}
                          className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Insert into Composer
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 font-mono text-[11px] max-h-14 overflow-y-auto leading-relaxed">
                    {streamedText}
                    {isStreaming && <span className="inline-block w-1 h-3 bg-cyan-400 animate-pulse ml-0.5 align-middle" />}
                  </p>
                </div>
              )}

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
                  className={`w-full bg-[#0d1424] border rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition resize-none ${
                    composerType === 'internal_note'
                      ? 'border-amber-500/30 focus:border-amber-500'
                      : 'border-indigo-500/30 focus:border-indigo-500'
                  }`}
                />

                <button
                  type="submit"
                  disabled={isSendingMessage || !composerContent.trim()}
                  className={`px-3.5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 disabled:opacity-40 cursor-pointer ${
                    composerType === 'internal_note'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {isSendingMessage ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
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
            {/* Enterprise Fase 3: Unified Real-Time AI Copilot & RAG Workspace */}
            <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-purple-950/20 space-y-4 relative overflow-hidden shadow-xl">
              {/* Header Bar: Title + Badges + Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <Zap className={`w-4 h-4 ${isStreaming ? 'animate-bounce text-yellow-300' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-extrabold text-sm tracking-normal capitalize">Enterprise AI Copilot</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase font-mono tracking-wider">
                        RAG Grounded
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal normal-case">
                      Real-time response synthesizer with PII sanitization & semantic caching
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Re-Stream / Stop Stream Action */}
                  {isStreaming ? (
                    <button
                      onClick={handleStopStream}
                      className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 rounded-xl border border-rose-500/30 transition shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Stop Stream</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStartStream}
                      className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md transition"
                      title="Re-generate response token-by-token with real-time vector RAG"
                    >
                      <Zap className="w-3.5 h-3.5 text-cyan-200" />
                      <span>{streamedText ? 'Re-Stream (SSE)' : 'Stream Live Copilot'}</span>
                    </button>
                  )}

                  {/* Copy Active Draft */}
                  {activeDraft && (
                    <button
                      onClick={() => handleCopyReply(activeDraft)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
                      title="Copy current AI reply to clipboard"
                    >
                      {copiedReply ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReply ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Guardrails, Engine Source, and Grounding Telemetry Pill Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                {/* PII Guardrail Badge */}
                <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                  streamMeta?.piiMasked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  <span>{streamMeta?.piiMasked ? 'PII Guardrail: Masked' : 'PII Guardrail: Clean'}</span>
                </div>

                {/* Engine Source Badge */}
                <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                  streamMeta?.cached
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : isStreaming
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse'
                    : streamedText
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                }`}>
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

                {/* RAG Grounding Citation */}
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  <Database className="w-3 h-3" />
                  <span>{streamMeta?.ragDoc || ticket.grounding_doc || 'VOL-I (Vector SOP)'}</span>
                </div>
              </div>

              {/* Active Draft Output Display */}
              {activeDraft || isStreaming ? (
                <div className="p-4 rounded-xl bg-[#080d18] border border-cyan-500/25 text-sm text-slate-100 font-sans leading-relaxed relative shadow-inner">
                  {streamedText || ticket.suggested_reply}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 align-middle" />
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#080d18]/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>No suggested reply generated yet. Click <b className="text-slate-200">"Stream Live Copilot"</b> to synthesize a RAG-grounded draft in real time.</span>
                </div>
              )}

              {/* Stream Error Alert (if any) */}
              {streamError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{streamError}</span>
                </div>
              )}

              {/* Action Bar: Adopt to Ticket, Insert to Composer & RLHF Feedback */}
              {activeDraft && (
                <div className="pt-2 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Approve & Adopt to customer */}
                    <button
                      onClick={handleApprove}
                      disabled={isApproving || approvalSuccess}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
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

                    {/* Insert to Composer to edit first */}
                    <button
                      onClick={handleInsertDraftToComposer}
                      className="px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Paste draft into composer to edit before sending"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Edit in Composer</span>
                    </button>
                  </div>

                  {/* RLHF Quality Feedback */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 text-[11px]">RLHF Feedback:</span>
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
                <div className="pt-2 space-y-2 border-t border-slate-800">
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

        {/* Modal Bottom: Status Management (Instant Optimistic Feedback) */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#090d18] border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Ticket Lifecycle:</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 uppercase">
              {ticket.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            {(['open', 'in_progress', 'closed'] as TicketStatus[]).map((st) => {
              const isActive = ticket.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    if (ticket.status === st) return;
                    // Instant 0ms optimistic trigger
                    onStatusUpdate(ticket.id, st);
                    if (apiKey) {
                      fetchAuditLogs(apiKey, ticket.id).then(setAuditLogs).catch(() => {});
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    isActive
                      ? st === 'closed'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                        : st === 'in_progress'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold'
                        : 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
