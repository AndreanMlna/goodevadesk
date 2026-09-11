import React from 'react';
import { Flame, Clock, ChevronRight } from 'lucide-react';
import { Ticket } from '../../types';
import {
  formatDeadline,
  PRIORITY_STYLES,
  STATUS_STYLES,
  CATEGORY_STYLES,
  SENTIMENT_ICONS,
} from '../../constants';

interface TicketCardItemProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
}

export const TicketCardItem: React.FC<TicketCardItemProps> = ({ ticket, onClick }) => {
  const priorityBadge = PRIORITY_STYLES[ticket.priority || 'normal'] || PRIORITY_STYLES.normal;
  const statusBadge = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
  const categoryBadge = CATEGORY_STYLES[ticket.category || 'technical'] || CATEGORY_STYLES.technical;
  const sentimentIcon = SENTIMENT_ICONS[ticket.sentiment || 'neutral'] || SENTIMENT_ICONS.neutral;
  const deadline = ticket.status === 'closed' ? null : formatDeadline(ticket.sla_deadline);

  const priorityBorder =
    ticket.status === 'closed'
      ? 'border-l-4 border-l-emerald-500'
      : ticket.priority === 'critical'
      ? 'border-l-4 border-l-rose-500'
      : ticket.priority === 'high'
      ? 'border-l-4 border-l-amber-500'
      : 'border-l-4 border-l-blue-500';

  return (
    <div
      onClick={() => onClick(ticket)}
      className={`glass-card p-3.5 sm:p-4 rounded-2xl hover:border-blue-500/40 transition cursor-pointer group space-y-3 ${priorityBorder}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Priority Badge */}
          <span
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide border flex items-center gap-1 ${priorityBadge}`}
          >
            {ticket.priority === 'critical' && <Flame className="w-3 h-3 text-rose-400 animate-pulse" />}
            {ticket.priority}
          </span>

          {/* Status Badge */}
          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${statusBadge}`}>
            {ticket.status.replace('_', ' ')}
          </span>

          {/* Category Badge */}
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${categoryBadge}`}>
            {ticket.category}
          </span>

          {/* SLA Deadline Badge */}
          {deadline && (
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1 ${
                deadline.isBreached
                  ? 'bg-rose-950/70 border-rose-800 text-rose-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Clock className="w-3 h-3 text-slate-500" />
              {deadline.text}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span title={`Sentiment: ${ticket.sentiment}`}>{sentimentIcon}</span>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition line-clamp-1">
          {ticket.subject}
        </h4>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {ticket.message}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-[11px] text-slate-500">
        <span className="font-mono text-slate-400 truncate max-w-[200px]">
          {ticket.customer_email}
        </span>
        <span>{new Date(ticket.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
};
