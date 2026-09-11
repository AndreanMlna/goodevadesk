import React from 'react';
import { X, Key, Shield, Cpu, Server, Check } from 'lucide-react';
import { OrganizationTenant } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTenant: OrganizationTenant;
  onTenantChange: (tenant: OrganizationTenant) => void;
  tenants: OrganizationTenant[];
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  onCustomKeySubmit: (e: React.FormEvent) => void;
  currentApiKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedTenant,
  onTenantChange,
  tenants,
  customApiKey,
  setCustomApiKey,
  onCustomKeySubmit,
  currentApiKey,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System Settings & API Keys</h3>
              <p className="text-xs text-slate-400">Configure tenant access and custom authentication credentials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 relative z-10">
          {/* Active Tenant Information */}
          <div className="p-3.5 rounded-xl bg-[#0b1120] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Active Organization:</span>
              <span className="font-bold text-blue-400">{selectedTenant.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Active API Key:</span>
              <code className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {currentApiKey.slice(0, 12)}...{currentApiKey.slice(-4)}
              </code>
            </div>
          </div>

          {/* Tenant Quick Switch */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Switch Organization Tenant
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTenantChange(t)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition ${
                    selectedTenant.id === t.id
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 font-semibold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{t.name}</span>
                  {selectedTenant.id === t.id && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom API Key Form */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Custom Tenant API Key
            </label>
            <form onSubmit={onCustomKeySubmit} className="flex gap-2">
              <input
                type="password"
                placeholder="Enter custom key (e.g. gdk_live_...)"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                Apply
              </button>
            </form>
            <p className="text-[11px] text-slate-500 mt-1">
              Requests will be strictly scoped with header: <code className="font-mono text-slate-400">x-api-key</code>
            </p>
          </div>

          {/* Architecture Badges */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenancy</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini LLM</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Redis Cache</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
