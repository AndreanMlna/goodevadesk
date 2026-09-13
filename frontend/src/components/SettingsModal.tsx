import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Key,
  Shield,
  Cpu,
  Server,
  Check,
  Bell,
  Send,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { OrganizationTenant } from '../types';
import {
  fetchWebhookConfig,
  updateWebhookConfig,
  testWebhookPing,
  triggerSlaEscalationCheck,
} from '../api';
import { trackTelemetryEvent } from '../lib/telemetry';

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
  const [activeTab, setActiveTab] = useState<'auth' | 'webhooks'>('auth');

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookPlatform, setWebhookPlatform] = useState<'slack' | 'discord' | 'generic'>('slack');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaveStatus, setWebhookSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // SLA Escalation State
  const [evaluatingSla, setEvaluatingSla] = useState(false);
  const [slaResultMsg, setSlaResultMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadWebhookConfig = useCallback(async () => {
    if (!currentApiKey || !isOpen) return;
    setLoadingWebhook(true);
    try {
      const config = await fetchWebhookConfig(currentApiKey);
      if (config) {
        setWebhookUrl(config.url || '');
        setWebhookPlatform((config.platform as 'slack' | 'discord' | 'generic') || 'slack');
        setWebhookEnabled(config.enabled ?? true);
      }
    } catch (err) {
      console.warn('[Settings] Webhook config could not be fetched:', err);
    } finally {
      setLoadingWebhook(false);
    }
  }, [currentApiKey, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadWebhookConfig();
      setWebhookSaveStatus(null);
      setTestResult(null);
      setSlaResultMsg(null);
    }
  }, [isOpen, loadWebhookConfig]);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWebhook(true);
    setWebhookSaveStatus(null);

    try {
      await updateWebhookConfig(currentApiKey, {
        url: webhookUrl.trim(),
        platform: webhookPlatform,
        enabled: webhookEnabled,
        events: ['critical_ticket', 'sla_escalated', 'sla_breached'],
      });

      trackTelemetryEvent('webhook_config_saved', {
        platform: webhookPlatform,
        enabled: webhookEnabled,
        tenant_name: selectedTenant.name,
      });

      setWebhookSaveStatus({
        type: 'success',
        message: 'Outbound webhook configuration saved successfully.',
      });
    } catch (err: any) {
      setWebhookSaveStatus({
        type: 'error',
        message: err.message || 'Failed to update webhook configuration.',
      });
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestPing = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a valid webhook endpoint URL before testing.',
      });
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);

    try {
      const res = await testWebhookPing(currentApiKey, {
        url: webhookUrl.trim(),
        platform: webhookPlatform,
      });

      trackTelemetryEvent('webhook_test_ping', {
        platform: webhookPlatform,
        success: res.success,
      });

      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error dispatching test webhook alert.',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleTriggerSlaCheck = async () => {
    setEvaluatingSla(true);
    setSlaResultMsg(null);

    try {
      const res = await triggerSlaEscalationCheck(currentApiKey);
      trackTelemetryEvent('sla_check_triggered', {
        escalated_count: res?.escalated_count || 0,
      });

      setSlaResultMsg({
        type: 'success',
        message: res?.message || `SLA Check complete. Evaluated ${res?.evaluated_count || 0} tickets, escalated ${res?.escalated_count || 0}.`,
      });
    } catch (err: any) {
      setSlaResultMsg({
        type: 'error',
        message: err.message || 'Failed to trigger SLA escalation check.',
      });
    } finally {
      setEvaluatingSla(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Enterprise Control Center</h3>
              <p className="text-xs text-slate-400">Configure multi-tenant auth, outbound webhooks, and SLA policies</p>
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('auth')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'auth'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Tenancy & Authentication</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'webhooks'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Outbound Webhooks & SLA</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/30 text-purple-200 font-bold">
              Enterprise
            </span>
          </button>
        </div>

        {/* Tab 1: Tenancy & Authentication */}
        {activeTab === 'auth' && (
          <div className="space-y-4 relative z-10 animate-fadeIn">
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
                Requests are strictly isolated with header: <code className="font-mono text-slate-400">x-api-key</code>
              </p>
            </div>

            {/* Architecture Badges */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
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
        )}

        {/* Tab 2: Outbound Webhooks & SLA */}
        {activeTab === 'webhooks' && (
          <div className="space-y-4 relative z-10 animate-fadeIn">
            {/* Webhook Feedback Alerts */}
            {webhookSaveStatus && (
              <div
                className={`p-2.5 rounded-xl flex items-center gap-2 text-xs ${
                  webhookSaveStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {webhookSaveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{webhookSaveStatus.message}</span>
              </div>
            )}

            {testResult && (
              <div
                className={`p-2.5 rounded-xl flex items-center gap-2 text-xs ${
                  testResult.success
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Outbound Webhook Config Form */}
            <form onSubmit={handleSaveWebhook} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Outbound Incident Alerts
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webhookEnabled}
                    onChange={(e) => setWebhookEnabled(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                  />
                  <span>Active Alerting</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Webhook Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={loadingWebhook}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['slack', 'discord', 'generic'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setWebhookPlatform(p)}
                    className={`p-2 rounded-xl border text-xs font-semibold capitalize transition ${
                      webhookPlatform === p
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {p === 'slack' && '💬 Slack Blocks'}
                    {p === 'discord' && '🎮 Discord Embed'}
                    {p === 'generic' && '🌐 Generic JSON'}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={testingWebhook || !webhookUrl}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingWebhook ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Test Ping Webhook</span>
                </button>

                <button
                  type="submit"
                  disabled={savingWebhook}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingWebhook ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>

            {/* SLA Auto-Escalation Engine */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    SLA Auto-Escalation Engine
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  CRON Active
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Automatically scans tickets nearing SLA breach (&le; 2 hours remaining) and auto-escalates priority
                from Normal/Low to High, or High to Critical with immutable audit logging.
              </p>

              {slaResultMsg && (
                <div
                  className={`p-2 rounded-xl flex items-center gap-2 text-xs ${
                    slaResultMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {slaResultMsg.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{slaResultMsg.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">Manual trigger for testing or immediate catch-up:</span>
                <button
                  type="button"
                  onClick={handleTriggerSlaCheck}
                  disabled={evaluatingSla}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {evaluatingSla ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Evaluate SLA Escalation Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

