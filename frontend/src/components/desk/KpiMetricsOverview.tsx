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
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
      {/* Card 1: Total Tickets */}
      <div className="double-bezel group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="double-bezel-inner p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full space-y-3">
          {/* Subtle Ambient Radial Orb */}
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform duration-300">
              <TicketIcon className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 truncate">
              Total Tickets
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
              {totalTickets}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">Active Tenant Hub</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Card 2: SLA Compliance */}
      <div className="double-bezel group hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="double-bezel-inner p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full space-y-3">
          {/* Subtle Ambient Radial Orb */}
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                isHealthySla
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50'
                  : 'text-amber-400 bg-amber-950/60 border-amber-800/50'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              {isHealthySla ? 'Compliant' : 'At Risk'}
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 truncate">
              SLA Compliance
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
              {slaComplianceRate.toFixed(1)}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className={isHealthySla ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isHealthySla ? '90% Target Achieved' : 'Resolution Attention Required'}
              </span>
            </p>
          </div>
          <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Card 3: AI Auto-Triage Rate */}
      <div className="double-bezel group hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="double-bezel-inner p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full space-y-3">
          {/* Subtle Ambient Radial Orb */}
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-purple-500/10 blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-purple-300 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full shadow-sm">
              <Sparkles className="w-3 h-3 text-purple-400" />
              AI Copilot
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 truncate">
              AI Auto-Triage
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
              {aiTriageRate.toFixed(1)}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-purple-300 font-semibold">Classification & RAG Grounded</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Card 4: Avg Resolution Target */}
      <div className="double-bezel group hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="double-bezel-inner p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between h-full space-y-3">
          {/* Subtle Ambient Radial Orb */}
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />

          <div className="flex items-start justify-between relative z-10">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform duration-300">
              <Clock className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full shadow-sm">
              <ArrowDownRight className="w-3 h-3 text-amber-400" />
              SLA Tier
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 truncate">
              Resolution Target
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
              {avgResolutionHours.toFixed(1)} hrs
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-amber-400 font-semibold">Priority Escalation SLA</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </section>
  );
};
