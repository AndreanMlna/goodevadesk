import React from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ticket as TicketIcon,
  RefreshCw,
  Flame,
  Tag,
  FileText,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Ticket, TicketStatus } from '../types';
import {
  formatDeadline,
  PRIORITY_STYLES,
  STATUS_STYLES,
  CATEGORY_STYLES,
  SENTIMENT_ICONS,
} from '../constants';

interface TicketDeskProps {
  filteredTickets: Ticket[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: TicketStatus | 'all';
  setStatusFilter: (status: TicketStatus | 'all') => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  stats: {
    total: number;
    open: number;
    in_progress: number;
    closed: number;
    critical: number;
  };
  onSelectTicket: (ticket: Ticket) => void;
  onOpenCreateModal: () => void;
  onRetry: () => void;
}

export const TicketDesk: React.FC<TicketDeskProps> = ({
  filteredTickets,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  stats,
  onSelectTicket,
  onOpenCreateModal,
  onRetry,
}) => {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Tickets</div>
          <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Critical (P1)
          </div>
          <div className="text-2xl font-black text-rose-300 mt-1">{stats.critical}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Open
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{stats.open}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </div>
          <div className="text-2xl font-black text-blue-300 mt-1">{stats.in_progress}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Closed
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{stats.closed}</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111827]/70 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-[#090d16] border border-slate-800 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject, message, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority Filter */}
          <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'critical', 'high', 'normal'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  priorityFilter === p
                    ? p === 'critical'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'critical' ? '🔥 P1' : p}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'open', 'in_progress', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  statusFilter === s ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'billing', 'technical', 'general'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                  categoryFilter === c ? 'bg-purple-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={onRetry} className="underline text-xs">Retry</button>
        </div>
      )}

      {/* Ticket List Section */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
          <p className="text-sm">Fetching tenant tickets & SLA states...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl p-8">
          <TicketIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No tickets found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            No support tickets match your filter criteria in this organization.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-4 px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold hover:bg-purple-600/30 transition"
          >
            Create New Ticket
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredTickets.map((ticket: Ticket) => {
            const deadlineInfo = formatDeadline(ticket.sla_deadline);
            const isCritical = ticket.priority === 'critical';
            const priorityStyle = PRIORITY_STYLES[ticket.priority || 'normal'] || PRIORITY_STYLES.normal;
            const statusStyle = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
            const categoryStyle = ticket.category ? CATEGORY_STYLES[ticket.category] || CATEGORY_STYLES.general : '';

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className={`glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 border ${
                  isCritical ? 'border-rose-500/40 shadow-lg shadow-rose-950/20' : 'border-slate-800/80'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400">
                      #{ticket.id.slice(0, 8)}
                    </span>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${priorityStyle}`}>
                      {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
                      {ticket.priority ? ticket.priority.toUpperCase() : 'NORMAL'}
                    </span>

                    <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusStyle}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>

                    {ticket.category ? (
                      <span className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full border flex items-center gap-1 ${categoryStyle}`}>
                        <Tag className="w-2.5 h-2.5" />
                        {ticket.category}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Uncategorized</span>
                    )}

                    {ticket.grounding_doc && (
                      <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                        <FileText className="w-2.5 h-2.5" />
                        {ticket.grounding_doc}
                      </span>
                    )}

                    {ticket._meta?.cache_hit && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono">
                        <Zap className="w-2.5 h-2.5" /> CACHED
                      </span>
                    )}

                    {ticket.sentiment && (
                      <span className="text-[11px] text-slate-400 capitalize flex items-center gap-0.5">
                        {SENTIMENT_ICONS[ticket.sentiment] || ''}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-100 truncate">{ticket.subject}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{ticket.message}</p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                  {deadlineInfo && (
                    <div
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                        deadlineInfo.isBreached
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : deadlineInfo.isUrgent
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {deadlineInfo.text}
                    </div>
                  )}

                  <div className="text-right">
                    <div className="text-slate-300 font-medium">{ticket.customer_email}</div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
