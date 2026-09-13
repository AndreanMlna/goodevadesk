import React from 'react';
import { Flame, Clock, ChevronRight, User, Smile, Frown, Meh, AlertOctagon } from 'lucide-react';
import { Ticket } from '../../types';
import {
  formatDeadline,
  PRIORITY_STYLES,
  STATUS_STYLES,
  CATEGORY_STYLES,
} from '../../constants';

interface TicketCardItemProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
}

export const TicketCardItem: React.FC<TicketCardItemProps> = ({ ticket, onClick }) => {
  const priorityBadge = PRIORITY_STYLES[ticket.priority || 'normal'] || PRIORITY_STYLES.normal;
  const statusBadge = STATUS_STYLES[ticket.status] || STATUS_STYLES.open;
  const categoryBadge = CATEGORY_STYLES[ticket.category || 'technical'] || CATEGORY_STYLES.technical;
  const deadline = ticket.status === 'closed' ? null : formatDeadline(ticket.sla_deadline);

  const priorityBorder =
    ticket.status === 'closed'
      ? 'border-l-[3px] border-l-emerald-500'
      : ticket.priority === 'critical'
      ? 'border-l-[3px] border-l-rose-500'
      : ticket.priority === 'high'
      ? 'border-l-[3px] border-l-amber-500'
      : 'border-l-[3px] border-l-blue-500';

  const renderSentimentIndicator = () => {
    switch (ticket.sentiment) {
      case 'positive':
        return (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full"
            title="Customer Sentiment: Positive"
          >
            <Smile className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Positive</span>
          </span>
        );
      case 'frustrated':
        return (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-300 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-full animate-pulse"
            title="Customer Sentiment: Frustrated"
          >
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            <span>Frustrated</span>
          </span>
        );
      case 'negative':
        return (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-full"
            title="Customer Sentiment: Negative"
          >
            <Frown className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Negative</span>
          </span>
        );
      case 'neutral':
      default:
        return (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-full"
            title="Customer Sentiment: Neutral"
          >
            <Meh className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Neutral</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onClick(ticket)}
      className="double-bezel group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.99] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
    >
      <div className={`double-bezel-inner p-4 sm:p-4.5 space-y-3 relative overflow-hidden ${priorityBorder}`}>
        {/* Top Badges Row & Trailing Capsule Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide border flex items-center gap-1 shadow-sm ${priorityBadge}`}
            >
              {ticket.priority === 'critical' && <Flame className="w-3 h-3 text-rose-400 animate-pulse" />}
              {ticket.priority}
            </span>

            {/* Status Badge */}
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border shadow-sm ${statusBadge}`}>
              {ticket.status.replace('_', ' ')}
            </span>

            {/* Category Badge */}
            <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium border shadow-sm ${categoryBadge}`}>
              {ticket.category}
            </span>

            {/* SLA Deadline Badge */}
            {deadline && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium border flex items-center gap-1 shadow-sm ${
                  deadline.isBreached
                    ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                    : 'bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                {deadline.text}
              </span>
            )}
          </div>

          {/* Right Action: SVG Sentiment + Button-in-Button Trailing Capsule */}
          <div className="flex items-center gap-2 shrink-0">
            {renderSentimentIndicator()}
            <div className="trailing-capsule group-hover:scale-105">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
            </div>
          </div>
        </div>

        {/* Middle Subject & Message */}
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-1">
            {ticket.subject}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {ticket.message}
          </p>
        </div>

        {/* Bottom Metadata Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
              {ticket.customer_email}
            </span>
            {ticket.assigned_to && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 px-2 py-0.5 rounded-full font-medium truncate max-w-[150px]">
                <User className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{ticket.assigned_to.split(' ')[0]}</span>
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
            {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
