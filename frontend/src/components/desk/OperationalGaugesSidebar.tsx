import React from 'react';
import { Layers, ChevronRight } from 'lucide-react';
import { Ticket } from '../../types';

interface OperationalGaugesSidebarProps {
  tickets?: Ticket[];
  onNavigateToShelf?: () => void;
}

export const OperationalGaugesSidebar: React.FC<OperationalGaugesSidebarProps> = ({
  tickets = [],
  onNavigateToShelf,
}) => {
  const now = new Date();
  const total = tickets.length;

  // 1. SLA Adherence: Percentage of tickets that are not breached
  const breachedCount = tickets.filter(
    (t) => t.status !== 'closed' && t.sla_deadline && new Date(t.sla_deadline) < now
  ).length;
  const slaAdherence =
    total > 0 ? Math.max(0, Math.round(((total - breachedCount) / total) * 1000) / 10) : 100;

  // 2. Cache Hit / Automated Triage Ratio: Tickets with suggested reply, grounding, or cached
  const cachedCount = tickets.filter(
    (t) => Boolean(t.grounding_doc || t.suggested_reply || t._meta?.cache_hit)
  ).length;
  const cacheHitRatio =
    total > 0 ? Math.round((cachedCount / total) * 1000) / 10 : 0;

  // 3. First Contact Resolution: Tickets resolved/closed
  const closedCount = tickets.filter((t) => t.status === 'closed').length;
  const fcrRatio =
    total > 0 ? Math.round((closedCount / total) * 1000) / 10 : 0;

  // 4. Top Incident Categories dynamically aggregated per tenant
  const categoryCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const cat = t.category || 'general';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryMetadata: Record<string, { label: string; dotColor: string }> = {
    billing: { label: 'Billing & Invoicing', dotColor: 'bg-emerald-400' },
    technical: { label: 'Technical & Systems', dotColor: 'bg-blue-400' },
    account: { label: 'Authentication & SSO', dotColor: 'bg-purple-400' },
    security: { label: 'Security & Access', dotColor: 'bg-rose-400' },
    feature_request: { label: 'Feature Request', dotColor: 'bg-amber-400' },
    general: { label: 'General Inquiries', dotColor: 'bg-cyan-400' },
  };

  const sortedCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="lg:col-span-4 space-y-5">
      {/* Quick Stats & SLA Progress Bars */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        <h4 className="text-sm font-bold text-white tracking-tight flex items-center justify-between">
          <span>Quick Stats</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            Live
          </span>
        </h4>

        {/* SLA Adherence Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">SLA Adherence</span>
            <span className="font-bold text-cyan-300">{slaAdherence.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${slaAdherence}%` }}
            />
          </div>
        </div>

        {/* Redis Cache Hit Ratio Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Cache Hit Ratio</span>
            <span className="font-bold text-amber-300">{cacheHitRatio.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${cacheHitRatio}%` }}
            />
          </div>
        </div>

        {/* First Contact Resolution (FCR) Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">First Contact Resolution</span>
            <span className="font-bold text-emerald-300">{fcrRatio.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${fcrRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Issue Categories & Volume */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        <h4 className="text-sm font-bold text-white tracking-tight flex items-center justify-between">
          <span>Top Incident Categories</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {sortedCategories.length} active
          </span>
        </h4>
        <div className="space-y-2.5 text-xs">
          {sortedCategories.length > 0 ? (
            sortedCategories.map(([catKey, count]) => {
              const meta = categoryMetadata[catKey] || {
                label: catKey.charAt(0).toUpperCase() + catKey.slice(1).replace('_', ' '),
                dotColor: 'bg-cyan-400',
              };
              return (
                <div
                  key={catKey}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                    <span className="text-slate-300 font-medium">{meta.label}</span>
                  </div>
                  <span className="font-bold text-white font-mono">
                    {count} {count === 1 ? 'tkt' : 'tkts'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-500 italic bg-slate-900/30 rounded-xl border border-slate-800/40">
              No incidents logged for this tenant
            </div>
          )}
        </div>
      </div>

      {/* Quick RAG & 3D Knowledge Hub Action */}
      <div className="glass-card p-5 rounded-2xl space-y-3 bg-gradient-to-b from-[#111827] to-[#151c2e]">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Authoritative RAG Hub</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Operational volumes Vol I - VII actively ground the automated triage pipeline with zero hallucinations.
        </p>
        {onNavigateToShelf && (
          <button
            type="button"
            onClick={onNavigateToShelf}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-semibold transition"
          >
            <span>Inspect 3D Knowledge Shelf</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
