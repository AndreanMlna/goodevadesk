import React from 'react';
import { Ticket, TicketStatus } from '../../types';

interface TicketLifecycleBarProps {
  ticket: Ticket;
  onStatusUpdate: (id: string, newStatus: TicketStatus) => Promise<void>;
  onRefreshAuditLogs?: () => void;
}

const LIFECYCLE_STATUSES: TicketStatus[] = ['open', 'in_progress', 'closed'];

export const TicketLifecycleBar: React.FC<TicketLifecycleBarProps> = ({
  ticket,
  onStatusUpdate,
  onRefreshAuditLogs,
}) => {
  const handleStatusClick = (st: TicketStatus) => {
    if (ticket.status === st) return;
    onStatusUpdate(ticket.id, st);
    if (onRefreshAuditLogs) {
      onRefreshAuditLogs();
    }
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-[#090d18] border-t border-slate-200 dark:border-slate-800 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Ticket Lifecycle:
        </span>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 uppercase shadow-xs">
          {ticket.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-900/90 border border-slate-300/70 dark:border-slate-800 p-1 rounded-xl">
        {LIFECYCLE_STATUSES.map((st) => {
          const isActive = ticket.status === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => handleStatusClick(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                isActive
                  ? st === 'closed'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : st === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
};
