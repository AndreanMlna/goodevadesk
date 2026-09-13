import React from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ticket as TicketIcon,
  RefreshCw,
  Plus,
  Layers,
  X,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { Ticket, TicketStatus } from '../types';
import { KpiMetricsOverview } from './desk/KpiMetricsOverview';
import { TicketCardItem } from './desk/TicketCardItem';
import { OperationalGaugesSidebar } from './desk/OperationalGaugesSidebar';

interface TicketDeskProps {
  filteredTickets: Ticket[];
  allTickets?: Ticket[];
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
  onNavigateToShelf?: () => void;
}

export const TicketDesk: React.FC<TicketDeskProps> = ({
  filteredTickets,
  allTickets,
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
  onNavigateToShelf,
}) => {
  const hasActiveFilters =
    priorityFilter !== 'all' || categoryFilter !== 'all' || Boolean(searchQuery.trim());

  const handleStatusTabClick = (newStatus: TicketStatus | 'all') => {
    setStatusFilter(newStatus);
    // When switching status tabs, reset priority filter if active so user immediately sees all tickets in that status
    if (priorityFilter !== 'all') {
      setPriorityFilter('all');
    }
  };

  const handleClearAllFilters = () => {
    setPriorityFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  const ticketsToAggregate = allTickets && allTickets.length > 0 ? allTickets : filteredTickets;
  const now = new Date();
  const totalCount = ticketsToAggregate.length;

  const breachedCount = ticketsToAggregate.filter(
    (t) => t.status !== 'closed' && t.sla_deadline && new Date(t.sla_deadline) < now
  ).length;
  const slaComplianceRate =
    totalCount > 0 ? Math.max(0, Math.round(((totalCount - breachedCount) / totalCount) * 1000) / 10) : 100;

  const triagedCount = ticketsToAggregate.filter((t) => t.category && t.priority).length;
  const aiTriageRate =
    totalCount > 0 ? Math.round((triagedCount / totalCount) * 1000) / 10 : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. TOP 4 METRIC KPI CARDS */}
      <KpiMetricsOverview
        totalTickets={stats.total}
        slaComplianceRate={slaComplianceRate}
        aiTriageRate={aiTriageRate}
      />

      {/* 2. ASYMMETRIC TWO-COLUMN LAYOUT (TICKET STREAM + GAUGES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Ticket Stream & Filtering Controls (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Search & Filter Bar with Double-Bezel */}
          <div className="double-bezel">
            <div className="double-bezel-inner p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tickets by subject, customer email, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 border border-slate-800/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`w-full sm:w-auto px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none cursor-pointer transition shadow-sm ${
                    categoryFilter !== 'all'
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-bold'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 focus:border-blue-500/60'
                  }`}
                >
                  <option value="all">All Categories</option>
                  <option value="billing">Billing</option>
                  <option value="technical">Technical</option>
                  <option value="account">Account</option>
                  <option value="security">Security</option>
                  <option value="feature_request">Feature Request</option>
                </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className={`w-full sm:w-auto px-3 py-2 border rounded-xl text-xs focus:outline-none cursor-pointer transition ${
                  priorityFilter !== 'all'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 focus:border-blue-500'
                }`}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical (P1)</option>
                <option value="high">High (P2)</option>
                <option value="normal">Normal (P3)</option>
                <option value="low">Low (P4)</option>
              </select>
            </div>

            {/* Status Tabs Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
              <button
                type="button"
                onClick={() => handleStatusTabClick('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => handleStatusTabClick('open')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  statusFilter === 'open'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-amber-300'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Open ({stats.open})
              </button>
              <button
                type="button"
                onClick={() => handleStatusTabClick('in_progress')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  statusFilter === 'in_progress'
                    ? 'bg-blue-500 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-blue-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> In Progress ({stats.in_progress})
              </button>
              <button
                type="button"
                onClick={() => handleStatusTabClick('closed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  statusFilter === 'closed'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Closed ({stats.closed})
              </button>
            </div>

            {/* Active Filter Chips Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs animate-fadeIn">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" />
                  <span>Active Filters:</span>
                </span>

                {priorityFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <span>Priority: {priorityFilter.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => setPriorityFilter('all')}
                      className="hover:text-white p-0.5 rounded transition"
                      title="Clear Priority Filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {categoryFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    <span>Category: {categoryFilter}</span>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className="hover:text-white p-0.5 rounded transition"
                      title="Clear Category Filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchQuery.trim() !== '' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    <span className="truncate max-w-[160px]">Search: "{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:text-white p-0.5 rounded transition"
                      title="Clear Search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline ml-auto flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear all filters</span>
                </button>
              </div>
            )}
            </div>
          </div>

          {/* Ticket Stream Master Card Container with Double-Bezel */}
          <div className="double-bezel shadow-2xl">
            <div className="double-bezel-inner rounded-[calc(1.25rem-1px)] overflow-hidden flex flex-col">
              {/* Card Container Header */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                    <span>Ticket Stream</span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0">
                      {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {statusFilter === 'all'
                      ? 'All operational tickets across organization'
                      : `Filtered by ${statusFilter.replace('_', ' ')} status`}
                  </p>
                </div>
              </div>

              {/* Scroll & View Indicator */}
              {filteredTickets.length > 2 && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>Scrollable Container</span>
                </div>
              )}
            </div>

            {/* Scrollable Container Body */}
            <div className="p-3.5 sm:p-4 space-y-3 max-h-[580px] lg:max-h-[640px] overflow-y-auto pr-2 custom-scrollbar">
              {loading && (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
                  <RefreshCw className="w-7 h-7 text-blue-400 animate-spin mb-3" />
                  <p className="text-sm font-medium">Fetching real-time ticket stream...</p>
                </div>
              )}

              {error && (
                <div className="p-6 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    <span>Failed to load tickets</span>
                  </div>
                  <p className="text-xs text-rose-300/80">{error}</p>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-xs font-semibold"
                  >
                    Retry Connection
                  </button>
                </div>
              )}

              {!loading && !error && filteredTickets.length === 0 && (
                <div className="text-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
                  <TicketIcon className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-200">No tickets match the selected filters</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {priorityFilter !== 'all'
                      ? `No ${statusFilter === 'all' ? '' : statusFilter.replace('_', ' ')} tickets have ${priorityFilter.toUpperCase()} priority.`
                      : 'Create a new ticket or reset your filters to see items.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onOpenCreateModal}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                    >
                      <Plus className="w-4 h-4" /> Create Ticket
                    </button>
                  </div>
                </div>
              )}

              {!loading &&
                !error &&
                filteredTickets.map((ticket) => (
                  <TicketCardItem
                    key={ticket.id}
                    ticket={ticket}
                    onClick={onSelectTicket}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

        {/* RIGHT COLUMN: Stitch Operational Gauges & Categories (4 cols on lg) */}
        <OperationalGaugesSidebar tickets={ticketsToAggregate} onNavigateToShelf={onNavigateToShelf} />
      </div>
    </div>
  );
};
