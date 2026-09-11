import React from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Activity,
  ShieldCheck,
  TrendingUp,
  FileText,
  Tag,
  Flame,
  Smile,
  Frown,
  Meh,
  ShieldAlert,
} from 'lucide-react';
import { AnalyticsSummaryResponse } from '../types';
import { formatDeadline } from '../constants';

interface ExecutiveAnalyticsProps {
  analyticsData: AnalyticsSummaryResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectTicketById: (id: string) => void;
}

export const ExecutiveAnalytics: React.FC<ExecutiveAnalyticsProps> = ({
  analyticsData,
  loading,
  error,
  onRetry,
  onSelectTicketById,
}) => {
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        <p className="text-sm">Aggregating executive metrics, sentiment & SLA trends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-rose-400" />
        <h3 className="font-bold">Failed to load executive analytics</h3>
        <p className="text-xs text-rose-200">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="space-y-6">
      {/* Executive Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Tickets</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white mt-2">{analyticsData.total_tickets}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Organization: <span className="text-purple-300 font-semibold">{analyticsData.tenant.name}</span>
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>SLA Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-300 mt-2">
            {100 - analyticsData.metrics.sla_compliance.breached_percentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {analyticsData.metrics.sla_compliance.breached} breached •{' '}
            {analyticsData.metrics.sla_compliance.at_risk_urgent} at urgent risk
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Avg Urgency Score</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300 mt-2">
            {analyticsData.metrics.avg_urgency_score}
            <span className="text-xs text-slate-400 font-normal"> / 100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Calculated via NLP & LLM Smart Triage</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>RAG Grounding SOPs</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-300 mt-2">
            {analyticsData.knowledge_base.grounding_sops_count} SOPs
          </div>
          <p className="text-[11px] text-indigo-300/80 mt-1 font-mono">
            {analyticsData.knowledge_base.available_sops.join(', ')}
          </p>
        </div>
      </div>

      {/* Analytical Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            <span>Category Distribution</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(analyticsData.metrics.category_breakdown).map(([cat, count]) => {
              const pct = analyticsData.total_tickets > 0 ? Math.round((count / analyticsData.total_tickets) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-slate-300">{cat}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat === 'billing' ? 'bg-rose-500' : cat === 'technical' ? 'bg-cyan-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority & Urgency Breakdown */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>Smart Triage Priorities</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(analyticsData.metrics.priority_breakdown).map(([pri, count]) => {
              const pct = analyticsData.total_tickets > 0 ? Math.round((count / analyticsData.total_tickets) * 100) : 0;
              return (
                <div key={pri} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="uppercase tracking-wider text-slate-300">{pri}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pri === 'critical' ? 'bg-rose-500' : pri === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Sentiment Matrix */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Smile className="w-4 h-4 text-emerald-400" />
            <span>Customer Sentiment Matrix</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(analyticsData.metrics.sentiment_breakdown).map(([sent, count]) => {
              const pct = analyticsData.total_tickets > 0 ? Math.round((count / analyticsData.total_tickets) * 100) : 0;
              return (
                <div key={sent} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="capitalize text-slate-300 flex items-center gap-1">
                      {sent === 'frustrated' && <Frown className="w-3.5 h-3.5 text-rose-400" />}
                      {sent === 'negative' && <Frown className="w-3.5 h-3.5 text-amber-400" />}
                      {sent === 'positive' && <Smile className="w-3.5 h-3.5 text-emerald-400" />}
                      {sent === 'neutral' && <Meh className="w-3.5 h-3.5 text-slate-400" />}
                      {sent}
                    </span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        sent === 'frustrated'
                          ? 'bg-rose-600'
                          : sent === 'negative'
                          ? 'bg-amber-500'
                          : sent === 'positive'
                          ? 'bg-emerald-500'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Issues Watchlist Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Critical Issues & SLA Breach Watchlist</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High urgency tickets requiring immediate supervisor intervention
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {analyticsData.critical_tickets.length} Urgent Tickets
          </span>
        </div>

        {analyticsData.critical_tickets.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No critical tickets or SLA breaches detected for this tenant. All SLAs healthy!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Ticket Subject</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Urgency Score</th>
                  <th className="p-3">SLA Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analyticsData.critical_tickets.map((t) => {
                  const deadline = formatDeadline(t.sla_deadline);
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">{t.subject}</td>
                      <td className="p-3 text-slate-400">{t.customer_email}</td>
                      <td className="p-3 capitalize">{t.category || 'general'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">{t.urgency_score || 80}/100</td>
                      <td className="p-3">
                        {deadline?.isBreached ? (
                          <span className="text-rose-400 font-bold">Breached</span>
                        ) : (
                          <span className="text-amber-300">{deadline?.text || 'Urgent'}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onSelectTicketById(t.id)}
                          className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/60 text-purple-200 rounded-lg text-[11px] font-semibold transition"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
