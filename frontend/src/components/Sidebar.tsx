import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  BarChart3,
  BookOpen,
  Sparkles,
  Database,
  Users,
  Settings,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  Check,
} from 'lucide-react';
import { OrganizationTenant } from '../types';

interface SidebarProps {
  activeTab: 'desk' | 'analytics' | 'shelf';
  setActiveTab: (tab: 'desk' | 'analytics' | 'shelf') => void;
  selectedTenant: OrganizationTenant;
  onTenantChange: (tenant: OrganizationTenant) => void;
  tenants: OrganizationTenant[];
  openTicketCount: number;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenSettings: () => void;
  theme?: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedTenant,
  onTenantChange,
  tenants,
  openTicketCount,
  isCollapsed,
  setIsCollapsed,
  onOpenSettings,
  theme = 'dark',
}) => {
  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close tenant dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTenantDropdownOpen(false);
      }
    };
    if (isTenantDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTenantDropdownOpen]);

  const coreNavItems = [
    {
      id: 'desk' as const,
      label: 'Ticket Desk',
      icon: Layers,
      badge: (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-bold backdrop-blur-sm ${
            activeTab === 'desk'
              ? 'bg-white/20 text-white'
              : theme === 'light'
              ? 'bg-slate-200 text-slate-800'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {openTicketCount} Open
        </span>
      ),
    },
    {
      id: 'analytics' as const,
      label: 'Executive Analytics',
      icon: BarChart3,
    },
    {
      id: 'shelf' as const,
      label: '3D Knowledge Shelf',
      icon: BookOpen,
      badge: (
        <span
          className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
            theme === 'light'
              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50'
          }`}
        >
          Vol I-VII
        </span>
      ),
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } ${
        theme === 'light'
          ? 'bg-[#f8fafc] border-r border-slate-200'
          : 'bg-[#090e1a] border-r border-slate-800/80'
      } hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 select-none`}
    >
      <div className="flex flex-col h-full relative">
        {/* Top Workspace / Tenant Switcher */}
        <div
          ref={dropdownRef}
          className={`relative ${
            isCollapsed ? 'p-3 flex justify-center' : 'p-4'
          } ${
            theme === 'light' ? 'border-b border-slate-200' : 'border-b border-slate-800/80'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsTenantDropdownOpen((prev) => !prev)}
            className={`${
              isCollapsed
                ? 'w-12 h-12 p-0 flex items-center justify-center rounded-xl mx-auto'
                : 'w-full flex items-center justify-between p-2.5 rounded-xl'
            } ${
              theme === 'light'
                ? 'bg-white border border-slate-200 hover:border-slate-300 shadow-sm text-left'
                : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-left'
            } transition cursor-pointer group`}
            title={isCollapsed ? `Tenant: ${selectedTenant.name} (Click to switch)` : 'Switch Tenant / Organization'}
          >
            {isCollapsed ? (
              /* Centered Logo Tile in Collapsed Mode (clean, un-squished) */
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center font-extrabold text-white shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white fill-white/20" />
              </div>
            ) : (
              /* Expanded Mode: Full brand, tenant name, and chevron */
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center font-extrabold text-white shadow-lg shadow-blue-500/20 shrink-0">
                    <Zap className="w-5 h-5 text-white fill-white/20" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold ${
                          theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                        } text-sm tracking-tight`}
                      >
                        GoodevaDesk
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p
                      className={`text-xs ${
                        theme === 'light' ? 'text-slate-500 font-medium' : 'text-slate-400'
                      } truncate`}
                    >
                      {selectedTenant.name} • Pro
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 ${
                    theme === 'light'
                      ? 'text-slate-500 group-hover:text-slate-800'
                      : 'text-slate-400 group-hover:text-slate-200'
                  } transition shrink-0 ml-1 ${
                    isTenantDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </>
            )}
          </button>

          {/* Tenant Dropdown Menu */}
          {isTenantDropdownOpen && (
            <div
              className={`absolute ${
                isCollapsed
                  ? 'left-[calc(100%+10px)] top-2 w-64'
                  : 'top-[78px] left-4 right-4'
              } ${
                theme === 'light'
                  ? 'bg-white border border-slate-200 shadow-2xl'
                  : 'bg-[#111827] border border-slate-700/80 shadow-2xl'
              } rounded-2xl p-2.5 z-50 animate-fadeIn`}
            >
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Select Organization
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold font-mono">
                  {tenants.length} Active
                </span>
              </div>
              <div className="space-y-1 mt-1">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onTenantChange(t);
                      setIsTenantDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition ${
                      selectedTenant.id === t.id
                        ? theme === 'light'
                          ? 'bg-blue-50 text-blue-600 font-bold border border-blue-200 shadow-sm'
                          : 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                        : theme === 'light'
                        ? 'text-slate-700 hover:bg-slate-100 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${selectedTenant.id === t.id ? 'bg-blue-500' : 'bg-slate-400'}`} />
                      <span className="font-semibold">{t.name}</span>
                    </div>
                    {selectedTenant.id === t.id ? (
                      <Check className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            {!isCollapsed && (
              <span
                className={`px-3 text-[11px] font-bold uppercase tracking-wider ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Core Operations
              </span>
            )}
            <nav className="mt-2 space-y-1.5">
              {coreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                    } py-2.5 rounded-xl transition group ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                        : theme === 'light'
                        ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                    }`}
                    title={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive
                            ? 'text-white'
                            : theme === 'light'
                            ? 'text-slate-500 group-hover:text-blue-600'
                            : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                      {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </div>
                    {!isCollapsed && item.badge}
                  </button>
                );
              })}

              {/* AI Triage & LLM Status */}
              <div
                className={`flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2.5 rounded-xl font-medium transition ${
                  theme === 'light' ? 'text-slate-700' : 'text-slate-400 opacity-85 hover:opacity-100'
                }`}
                title="Gemini AI Auto-Triage Active"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        theme === 'light' ? 'text-slate-700 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      AI Triage & LLM
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600" />
                  </span>
                )}
              </div>

              {/* Semantic Cache */}
              <div
                className={`flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2.5 rounded-xl font-medium transition ${
                  theme === 'light' ? 'text-slate-700' : 'text-slate-400 opacity-85 hover:opacity-100'
                }`}
                title="Redis Semantic Cache (Normalized SHA-256)"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-amber-500 shrink-0" />
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        theme === 'light' ? 'text-slate-700 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      Semantic Cache
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span
                    className={`text-[11px] font-mono font-bold inline-flex items-center gap-1 ${
                      theme === 'light'
                        ? 'text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300'
                        : 'text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40'
                    }`}
                  >
                    <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400/20" />
                    <span>&lt;15ms</span>
                  </span>
                )}
              </div>

              {/* Customers & Orgs */}
              <div
                className={`flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2.5 rounded-xl font-medium transition ${
                  theme === 'light' ? 'text-slate-700' : 'text-slate-400 opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan-600 shrink-0" />
                  {!isCollapsed && (
                    <span
                      className={`text-sm ${
                        theme === 'light' ? 'text-slate-700 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      Customers & Orgs
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                      theme === 'light'
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {tenants.length} Tenants
                  </span>
                )}
              </div>
            </nav>
          </div>

          {/* Governance & Config */}
          <div>
            {!isCollapsed && (
              <span
                className={`px-3 text-[11px] font-bold uppercase tracking-wider ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Governance & Config
              </span>
            )}
            <nav className="mt-2 space-y-1.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2.5 rounded-xl transition group font-medium text-left ${
                  theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Settings & API Keys"
              >
                <div className="flex items-center gap-3">
                  <Settings
                    className={`w-5 h-5 ${
                      theme === 'light'
                        ? 'text-slate-500 group-hover:text-slate-800'
                        : 'text-slate-400 group-hover:text-slate-200'
                    } transition shrink-0`}
                  />
                  {!isCollapsed && <span className="text-sm">Settings & API Keys</span>}
                </div>
                {!isCollapsed && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      theme === 'light'
                        ? 'bg-slate-200 text-slate-700 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Keys
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shelf')}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2.5 rounded-xl transition group font-medium text-left ${
                  theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/70'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="SOP Policies & Docs"
              >
                <div className="flex items-center gap-3">
                  <FileText
                    className={`w-5 h-5 ${
                      theme === 'light'
                        ? 'text-slate-500 group-hover:text-slate-800'
                        : 'text-slate-400 group-hover:text-slate-200'
                    } transition shrink-0`}
                  />
                  {!isCollapsed && <span className="text-sm">SOP Policies & Docs</span>}
                </div>
              </button>
            </nav>
          </div>

          {/* Cluster Health Status Widget */}
          {!isCollapsed && (
            <div
              className={`p-3.5 rounded-xl ${
                theme === 'light'
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800'
              } text-xs space-y-2`}
            >
              <div
                className={`flex items-center justify-between ${
                  theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'
                }`}
              >
                <span>Cluster Health</span>
                <span
                  className={`${
                    theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'
                  } font-bold flex items-center gap-1`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 99.98%
                </span>
              </div>
              <div
                className={`w-full ${
                  theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                } h-1.5 rounded-full overflow-hidden`}
              >
                <div className="bg-emerald-500 h-full rounded-full w-[99.8%]" />
              </div>
              <p
                className={`text-[11px] ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Encrypted VPC peering • US-East-1
              </p>
            </div>
          )}
        </div>

        {/* Bottom Sidebar Collapsible Toggle */}
        <div
          className={`p-3 ${
            theme === 'light' ? 'border-t border-slate-200' : 'border-t border-slate-800/80'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
              theme === 'light'
                ? 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-slate-800'
            } transition`}
            title={isCollapsed ? 'Expand Sidebar' : 'Hide Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>&lt;&lt; Hide Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
