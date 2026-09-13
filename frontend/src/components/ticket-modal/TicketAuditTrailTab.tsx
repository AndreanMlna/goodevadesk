import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AuditLogItem } from '../../types';

interface TicketAuditTrailTabProps {
  auditLogs: AuditLogItem[];
}

export const TicketAuditTrailTab: React.FC<TicketAuditTrailTabProps> = ({ auditLogs }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-400">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Immutable Event History (SOC-2 Type II Compliance)
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          Total Events: {auditLogs.length}
        </span>
      </div>

      {auditLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
          No audit events recorded yet for this ticket.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {auditLogs.map((log) => (
            <div key={log.id} className="relative group">
              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-teal-500/20 border-2 border-teal-500 dark:border-teal-400" />
              <div className="bg-white dark:bg-[#0b1220] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 text-xs space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {log.actor_name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    {log.action.replace('_', ' ')}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 text-xs">{log.details}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
