import React, { useState } from 'react';
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
  CheckCircle2,
  Clock,
  Database,
  Code2,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnalyticsSummaryResponse } from '../types';
import { formatDeadline } from '../constants';
import { fetchBigQueryBlueprint } from '../api';

interface ExecutiveAnalyticsProps {
  apiKey?: string;
  analyticsData: AnalyticsSummaryResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectTicketById: (id: string) => void;
}

export const ExecutiveAnalytics: React.FC<ExecutiveAnalyticsProps> = ({
  apiKey,
  analyticsData,
  loading,
  error,
  onRetry,
  onSelectTicketById,
}) => {
  const [showBqSection, setShowBqSection] = useState(false);
  const [bqBlueprint, setBqBlueprint] = useState<any>(null);
  const [loadingBq, setLoadingBq] = useState(false);
  const [selectedBqQuery, setSelectedBqQuery] = useState<'forecast' | 'similarity' | 'anomaly'>('forecast');
  const [copiedQuery, setCopiedQuery] = useState(false);

  const handleToggleBq = async () => {
    if (!showBqSection && !bqBlueprint && apiKey) {
      setLoadingBq(true);
      try {
        const data = await fetchBigQueryBlueprint(apiKey);
        setBqBlueprint(data);
      } catch (err) {
        console.warn('Could not load BigQuery ML blueprint:', err);
      } finally {
        setLoadingBq(false);
      }
    }
    setShowBqSection((prev) => !prev);
  };

  const handleCopySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };
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
                  <th className="p-3">Status</th>
                  <th className="p-3">Urgency Score</th>
                  <th className="p-3">SLA Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analyticsData.critical_tickets.map((t) => {
                  const deadline = t.status === 'closed' ? null : formatDeadline(t.sla_deadline);
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-3 font-semibold text-white max-w-xs truncate">{t.subject}</td>
                      <td className="p-3 text-slate-400">{t.customer_email}</td>
                      <td className="p-3 capitalize">{t.category || 'general'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            t.priority === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            t.status === 'closed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : t.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-300">{t.urgency_score || 80}/100</td>
                      <td className="p-3">
                        {t.status === 'closed' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                          </span>
                        ) : deadline?.isBreached ? (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Breached
                          </span>
                        ) : (
                          <span className="text-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {deadline?.text || 'Urgent'}
                          </span>
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

      {/* Enterprise Fase 3: Google BigQuery AI/ML Warehouse Blueprint */}
      <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900/60 via-blue-950/20 to-slate-900/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Google BigQuery AI & ML Warehouse Blueprint</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] text-blue-300 font-mono border border-blue-500/40">
                  /bigquery-ai-ml
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enterprise AI SQL pipelines for ticket forecasting, vector embedding distance, and SLA resolution anomalies.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleBq}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-xl text-xs font-semibold transition"
          >
            {loadingBq ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : showBqSection ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>{showBqSection ? 'Hide SQL Blueprint' : 'Inspect BQML Pipelines'}</span>
          </button>
        </div>

        {showBqSection && (
          <div className="pt-3 border-t border-blue-500/20 space-y-4 animate-fadeIn">
            {/* Query Selector Tabs */}
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setSelectedBqQuery('forecast')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-medium ${
                  selectedBqQuery === 'forecast'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>1. ARIMA_PLUS Forecasting</span>
              </button>

              <button
                onClick={() => setSelectedBqQuery('similarity')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-medium ${
                  selectedBqQuery === 'similarity'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. ML.SIMILARITY Search</span>
              </button>

              <button
                onClick={() => setSelectedBqQuery('anomaly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-medium ${
                  selectedBqQuery === 'anomaly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>3. K-Means SLA Anomalies</span>
              </button>
            </div>

            {/* SQL Query Code Display */}
            {bqBlueprint?.queries && (
              <div className="relative rounded-xl overflow-hidden border border-slate-700/60 bg-[#080d1a]">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/40 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono text-slate-300">
                      {selectedBqQuery === 'forecast'
                        ? 'bigquery/forecast_ticket_volume.sql'
                        : selectedBqQuery === 'similarity'
                        ? 'bigquery/semantic_similarity.sql'
                        : 'bigquery/detect_sla_anomalies.sql'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const queryMap: Record<string, string> = {
                        forecast: bqBlueprint.queries.forecastTicketVolume,
                        similarity: bqBlueprint.queries.semanticSimilaritySearch,
                        anomaly: bqBlueprint.queries.detectSlaAnomalies,
                      };
                      handleCopySql(queryMap[selectedBqQuery] || '');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-700/60 hover:bg-slate-600 text-slate-200 rounded-md transition text-[11px]"
                  >
                    {copiedQuery ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedQuery ? 'Copied!' : 'Copy SQL'}</span>
                  </button>
                </div>

                <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-72">
                  {selectedBqQuery === 'forecast' && bqBlueprint.queries.forecastTicketVolume}
                  {selectedBqQuery === 'similarity' && bqBlueprint.queries.semanticSimilaritySearch}
                  {selectedBqQuery === 'anomaly' && bqBlueprint.queries.detectSlaAnomalies}
                </pre>
              </div>
            )}

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <b>Production Data Lake Architecture:</b> These queries execute serverless in Google BigQuery. They train directly on partitioned historical support ticket logs without data movement, predicting volume spikes 7 days in advance with 95% confidence intervals.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
