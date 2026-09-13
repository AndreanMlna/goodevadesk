import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Moon,
  Sun,
  RefreshCw,
  Plus,
  ShieldCheck,
  Flame,
  Clock,
  ChevronRight,
  CheckCircle2,
  X,
  AlertTriangle,
  Zap,
  ChevronDown,
  Search,
} from 'lucide-react';
import { OrganizationTenant, Ticket } from '../types';
import { formatDeadline } from '../constants';

interface HeaderBarProps {
  activeTab: 'desk' | 'analytics' | 'shelf';
  selectedTenant: OrganizationTenant;
  ticketCount: number;
  criticalCount: number;
  criticalTickets?: Ticket[];
  onSelectTicket?: (ticket: Ticket) => void;
  onFilterCritical?: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenCreateModal: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  selectedTenant,
  ticketCount,
  criticalCount,
  criticalTickets = [],
  onSelectTicket,
  onFilterCritical,
  onRefresh,
  isLoading,
  onOpenCreateModal,
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
  onOpenCommandPalette,
}) => {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAlertOpen(false);
      }
    };
    if (isAlertOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAlertOpen]);

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'analytics':
        return 'Executive Analytics';
      case 'shelf':
        return '3D Knowledge & Policy Shelf';
      case 'desk':
      default:
        return 'Operations Dashboard';
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'analytics':
        return `Multi-tenant SLA compliance, sentiment matrix, and critical incident watchlist for ${selectedTenant.name}`;
      case 'shelf':
        return `Authoritative operational volumes grounding the RAG triage pipeline for ${selectedTenant.name}`;
      case 'desk':
      default:
        return (
          <>
            Welcome back!{' '}
            <span className="text-slate-200 font-semibold">{ticketCount} tickets</span> require attention across{' '}
            <span className="text-blue-400 font-medium">{selectedTenant.name}</span>
          </>
        );
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 ${
        theme === 'light'
          ? 'bg-white/95 border-b border-slate-200 shadow-sm'
          : 'bg-[#0b1120]/90 border-b border-slate-800/80'
      } backdrop-blur-xl transition-all relative`}
    >
      {/* 1. MOBILE TOP APP BAR (Stitch Mobile Design: md:hidden) */}
      <div className="md:hidden flex items-center justify-between h-16 px-4">
        {/* Brand & Organization Switcher Trigger */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
            <Zap className="w-4 h-4 text-white fill-white/20" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`font-bold text-sm tracking-tight truncate ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                GoodevaDesk
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className={`text-[11px] font-semibold text-left truncate flex items-center gap-1 ${
                theme === 'light' ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
              }`}
              title="Change Organization"
            >
              <span className="truncate max-w-[120px]">{selectedTenant.name} • Pro</span>
              <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
            </button>
          </div>
        </div>

        {/* Mobile Right Controls: Search, Theme Toggle, Notifications, New Ticket (+) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
              }`}
              aria-label="Command Palette"
              title="Command Palette (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-indigo-400" />
            </button>
          )}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
              }`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/20" />
              )}
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAlertOpen((prev) => !prev)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition relative ${
                isAlertOpen
                  ? 'bg-blue-600/15 border-blue-500 text-blue-600'
                  : theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
              }`}
              aria-label="Alerts"
            >
              <Bell className="w-4 h-4" />
            </button>
            {criticalCount > 0 && (
              <span
                onClick={() => setIsAlertOpen((prev) => !prev)}
                className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-[#0b1120] animate-pulse cursor-pointer"
              >
                {criticalCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 active:scale-95 transition"
            aria-label="New Ticket"
            title="Create New Ticket"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. DESKTOP FULL HEADER (hidden md:flex) */}
      <div className="hidden md:flex items-center justify-between px-6 py-3.5">
        {/* Left Header Title & Subtext */}
        <div>
          <div className="flex items-center gap-3">
            <h1
              className={`text-lg md:text-xl font-extrabold ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              } tracking-tight`}
            >
              {getHeaderTitle()}
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                theme === 'light'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className={`text-xs ${theme === 'light' ? 'text-slate-500 font-medium' : 'text-slate-400'} mt-0.5`}>
            {getHeaderSubtitle()}
          </p>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          {/* Global Command Palette Trigger Button */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title="Search tickets, switch tenants, or execute actions (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Search or Command...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800/80 border border-slate-700 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>
          )}
          {/* Tenant Status Badge */}
          <div
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs shadow-sm ${
              theme === 'light'
                ? 'bg-slate-100 border border-slate-200 text-slate-700'
                : 'bg-slate-900 border border-slate-700/80 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`font-semibold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
              Tenant Isolated
            </span>
            <span className={theme === 'light' ? 'text-slate-300' : 'text-slate-600'}>|</span>
            <span className="text-[11px] font-mono text-cyan-600 font-bold">v3.4.1</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition disabled:opacity-50 ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Notification Bell Icon */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAlertOpen((prev) => !prev)}
              className={`p-2 rounded-xl border transition relative ${
                isAlertOpen
                  ? 'bg-blue-600/15 border-blue-500 text-blue-600'
                  : theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title={`${criticalCount} Critical Tickets Alert - Click to inspect`}
            >
              <Bell className="w-4 h-4" />
            </button>

            {criticalCount > 0 && (
              <span
                onClick={() => setIsAlertOpen((prev) => !prev)}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-[#0b1120] animate-pulse cursor-pointer"
                title={`${criticalCount} Critical Tickets`}
              >
                {criticalCount}
              </span>
            )}
          </div>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/AndreanMlna/goodevadesk"
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-xl border transition flex items-center justify-center ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="View GoodevaDesk on GitHub (@AndreanMlna)"
            aria-label="GitHub Repository"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          {/* Theme Switcher Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition relative flex items-center justify-center group ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* Create Ticket CTA */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>

          {/* Admin Profile Avatar */}
          <div
            className={`flex items-center gap-2.5 pl-2 border-l ${
              theme === 'light' ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div className="relative cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/10">
                SC
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ${
                  theme === 'light' ? 'ring-white' : 'ring-[#0b1120]'
                }`}
              />
            </div>
            <div className="hidden sm:block text-left">
              <p
                className={`text-xs font-bold ${
                  theme === 'light' ? 'text-slate-900' : 'text-slate-200'
                } leading-tight`}
              >
                Sarah Chen
              </p>
              <p
                className={`text-[10px] ${
                  theme === 'light' ? 'text-slate-500 font-medium' : 'text-slate-400'
                }`}
              >
                Lead SRE & Ops
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SHARED RESPONSIVE CRITICAL NOTIFICATIONS DROPDOWN */}
      {isAlertOpen && (
        <div
          ref={dropdownRef}
          className={`absolute right-3 sm:right-6 top-16 w-[calc(100vw-24px)] max-w-sm sm:w-96 ${
            theme === 'light'
              ? 'bg-white border border-slate-200 shadow-2xl'
              : 'bg-[#111827] border border-slate-700 shadow-2xl'
          } rounded-2xl z-50 overflow-hidden animate-fadeIn`}
        >
          {/* Dropdown Header */}
          <div
            className={`p-3.5 border-b ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-50'
                : 'border-slate-800 bg-slate-900/60'
            } flex items-center justify-between`}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  Critical SLA Alerts
                </h4>
                <p className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {selectedTenant.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                  criticalCount > 0
                    ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {criticalCount > 0 ? `${criticalCount} Urgent Alerts` : 'All Clear'}
              </span>
              <button
                type="button"
                onClick={() => setIsAlertOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Critical Tickets List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {criticalTickets.length === 0 ? (
              <div className="p-6 text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                  All Critical SLAs Clear
                </p>
                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  No critical tickets or SLA breaches pending in this organization.
                </p>
              </div>
            ) : (
              criticalTickets.map((ticket) => {
                const deadline = ticket.status === 'closed' ? null : formatDeadline(ticket.sla_deadline);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setIsAlertOpen(false);
                      if (onSelectTicket) onSelectTicket(ticket);
                    }}
                    className={`p-3 transition cursor-pointer group ${
                      theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                            ticket.priority === 'critical'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 truncate">
                          {ticket.customer_email}
                        </span>
                      </div>
                      {ticket.status === 'closed' ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
                        </span>
                      ) : deadline ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                            deadline.isBreached
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {deadline.text}
                        </span>
                      ) : null}
                    </div>
                    <h5
                      className={`text-xs font-bold mt-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition ${
                        theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                      }`}
                    >
                      {ticket.subject}
                    </h5>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 capitalize">{ticket.category}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer CTA */}
          {onFilterCritical && criticalTickets.length > 0 && (
            <div
              className={`p-2.5 border-t ${
                theme === 'light'
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsAlertOpen(false);
                  onFilterCritical();
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200 text-xs font-bold transition text-center flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>Filter & View All Critical in Desk</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
