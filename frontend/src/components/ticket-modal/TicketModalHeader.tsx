import React from 'react';
import { X, Flame, Clock, User } from 'lucide-react';
import { Ticket } from '../../types';
import { formatDeadline, PRIORITY_STYLES, CATEGORY_STYLES } from '../../constants';

interface TicketModalHeaderProps {
  ticket: Ticket;
  assignedTo: string;
  isAssigning: boolean;
  onAssigneeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onClose: () => void;
  teamMembers: string[];
}

export const TicketModalHeader: React.FC<TicketModalHeaderProps> = ({
  ticket,
  assignedTo,
  isAssigning,
  onAssigneeChange,
  onClose,
  teamMembers,
}) => {
  const priorityStyle =
    PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.normal;
  const categoryStyle =
    CATEGORY_STYLES[ticket.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.general;
  const deadlineInfo = ticket.sla_deadline ? formatDeadline(ticket.sla_deadline) : null;
  const isCritical = ticket.priority === 'critical';

  return (
    <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c1222] flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60 shrink-0">
          ID: {ticket.id.slice(0, 13)}...
        </span>
        {ticket.priority && (
          <span
            className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${priorityStyle}`}
          >
            {isCritical && <Flame className="w-3 h-3 text-rose-400" />}
            {ticket.priority}
          </span>
        )}
        {ticket.category && (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border shrink-0 ${categoryStyle}`}
          >
            {ticket.category}
          </span>
        )}
        {ticket.urgency_score !== undefined && ticket.urgency_score !== null && (
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
            Urgency: {Math.round(ticket.urgency_score * 100)}%
          </span>
        )}
        {ticket.sla_deadline && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono shrink-0 ${
              ticket.status === 'closed'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : deadlineInfo?.isBreached
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title={`SLA Resolution Target: ${new Date(ticket.sla_deadline).toLocaleString()}`}
          >
            <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              {ticket.status === 'closed'
                ? 'SLA Resolved'
                : deadlineInfo?.isBreached
                ? 'SLA Breached'
                : deadlineInfo?.text}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1 rounded-lg shadow-xs">
          <User className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
            Assignee:
          </span>
          <select
            value={assignedTo || 'Unassigned'}
            onChange={onAssigneeChange}
            disabled={isAssigning}
            className="bg-transparent text-[11px] text-slate-800 dark:text-indigo-200 font-semibold focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
          >
            {teamMembers.map((member) => (
              <option
                key={member}
                value={member}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {member}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
