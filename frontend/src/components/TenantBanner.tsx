import React from 'react';
import { Key, Bot, FileText, Zap } from 'lucide-react';
import { OrganizationTenant } from '../types';

interface TenantBannerProps {
  selectedTenant: OrganizationTenant;
  apiKey: string;
}

export const TenantBanner: React.FC<TenantBannerProps> = ({ selectedTenant, apiKey }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-[#0d1322]/80">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <div>
          <div className="text-sm font-semibold text-slate-200">
            Active Tenant: <span className="text-purple-300 font-bold">{selectedTenant.name}</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <Key className="w-3 h-3 text-slate-500" />
            <code className="bg-black/30 px-1.5 py-0.5 rounded text-[11px] text-slate-300">
              {apiKey.slice(0, 16)}...
            </code>
            <span>• Strict Tenant Scoping (`organization_id`)</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1 text-purple-300">
          <Bot className="w-3.5 h-3.5" /> AI Smart Triage (P1-P4)
        </span>
        <span className="flex items-center gap-1 text-indigo-300">
          <FileText className="w-3.5 h-3.5" /> RAG Grounding (3 Enterprise SOPs)
        </span>
        <span className="flex items-center gap-1 text-amber-300">
          <Zap className="w-3.5 h-3.5" /> Semantic + L1 Redis Cache
        </span>
      </div>
    </div>
  );
};
