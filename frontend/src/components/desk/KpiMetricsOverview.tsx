import React from 'react';
import {
  Ticket as TicketIcon,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface KpiMetricsOverviewProps {
  totalTickets: number;
  slaComplianceRate?: number;
  aiTriageRate?: number;
  avgResolutionHours?: number;
}

export const KpiMetricsOverview: React.FC<KpiMetricsOverviewProps> = ({
  totalTickets,
  slaComplianceRate = 96.8,
  aiTriageRate = 78.4,
  avgResolutionHours = 1.8,
}) => {
  const isHealthySla = slaComplianceRate >= 90;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Card 1: Total Tickets */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
            <TicketIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 sm:px-2 py-0.5 rounded-full">
            <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Live
          </span>
        </div>
        <div className="mt-3 sm:mt-4">
          <p className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-400 truncate">Total Tickets</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 sm:mt-1 tracking-tight">{totalTickets}</h3>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">Tenant Active</span>
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>

      {/* Card 2: SLA Compliance */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${
              isHealthySla
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                : 'text-amber-400 bg-amber-950/60 border-amber-800/40'
            }`}
          >
            <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {isHealthySla ? 'Good' : 'At Risk'}
          </span>
        </div>
        <div className="mt-3 sm:mt-4">
          <p className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-400 truncate">SLA Compliance</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 sm:mt-1 tracking-tight">
            {slaComplianceRate.toFixed(1)}%
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className={isHealthySla ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
              {isHealthySla ? 'On-track' : 'Breaches detected'}
            </span>
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>

      {/* Card 3: AI Auto-Triage Rate */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/40 px-1.5 sm:px-2 py-0.5 rounded-full">
            <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> AI
          </span>
        </div>
        <div className="mt-3 sm:mt-4">
          <p className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-400 truncate">AI Triage Rate</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 sm:mt-1 tracking-tight">
            {aiTriageRate.toFixed(1)}%
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-purple-400 font-medium">automated classification</span>
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>

      {/* Card 4: Avg Resolution Time */}
      <div className="glass-card rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 sm:px-2 py-0.5 rounded-full">
            <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> SLA
          </span>
        </div>
        <div className="mt-3 sm:mt-4">
          <p className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-400 truncate">Avg Resolution Target</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5 sm:mt-1 tracking-tight">
            {avgResolutionHours.toFixed(1)} hrs
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">Standard SLA Tier</span>
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
      </div>
    </section>
  );
};
