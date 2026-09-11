import React from 'react';
import {
  Sparkles,
  Ticket as TicketIcon,
  BarChart3,
  Building2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { OrganizationTenant } from '../types';
import { DEFAULT_TENANTS } from '../constants';

interface NavbarProps {
  activeTab: 'desk' | 'analytics';
  setActiveTab: (tab: 'desk' | 'analytics') => void;
  selectedTenant: OrganizationTenant;
  onTenantChange: (tenant: OrganizationTenant) => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  onCustomKeySubmit: (e: React.FormEvent) => void;
  onRefresh: () => void;
  isLoading: boolean;
  criticalCount: number;
  onOpenCreateModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedTenant,
  onTenantChange,
  customApiKey,
  setCustomApiKey,
  onCustomKeySubmit,
  onRefresh,
  isLoading,
  criticalCount,
  onOpenCreateModal,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/20">
          <div className="w-full h-full bg-[#0d1322] rounded-[11px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              GoodevaDesk
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Enterprise AI Suite
            </span>
          </div>
          <p className="text-xs text-slate-400">Multi-tenant Support • RAG Grounding • Smart Triage</p>
        </div>
      </div>

      <div className="flex items-center bg-[#111827] p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('desk')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'desk'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TicketIcon className="w-3.5 h-3.5" />
          <span>Support Desk</span>
          {criticalCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white animate-pulse">
              {criticalCount} P1
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'analytics'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Executive Analytics & SLA</span>
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#111827]/80 p-1.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400">
          <Building2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Tenant:</span>
        </div>

        {DEFAULT_TENANTS.map((tenant) => (
          <button
            key={tenant.id}
            onClick={() => onTenantChange(tenant)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              selectedTenant.apiKey === tenant.apiKey
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tenant.name}
          </button>
        ))}

        <form onSubmit={onCustomKeySubmit} className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-700">
          <input
            type="password"
            placeholder="Custom API key..."
            value={customApiKey}
            onChange={(e) => setCustomApiKey(e.target.value)}
            className="bg-[#090d16] border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 w-28 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium"
          >
            Connect
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl transition"
          title="Refresh current view"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
        </button>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition-all transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Create Ticket</span>
        </button>
      </div>
    </header>
  );
};
