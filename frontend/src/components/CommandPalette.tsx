import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  BarChart3,
  BookOpen,
  Inbox,
  Flame,
  Building2,
  Moon,
  Sun,
  ArrowRight,
  Sparkles,
  X,
  Ticket as TicketIcon,
} from 'lucide-react';
import { Ticket, OrganizationTenant, TicketStatus } from '../types';
import { DEFAULT_TENANTS, PRIORITY_STYLES, CATEGORY_STYLES } from '../constants';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenCreateTicket: () => void;
  onNavigateTab: (tab: 'desk' | 'analytics' | 'shelf') => void;
  onSetStatusFilter: (status: TicketStatus | 'all') => void;
  onSetPriorityFilter: (priority: string) => void;
  onTenantChange: (tenant: OrganizationTenant) => void;
  selectedTenant: OrganizationTenant;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

interface CommandItem {
  id: string;
  category: 'Actions' | 'Navigation' | 'Tenants' | 'Tickets';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeStyle?: string;
  onSelect: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tickets,
  onSelectTicket,
  onOpenCreateTicket,
  onNavigateTab,
  onSetStatusFilter,
  onSetPriorityFilter,
  onTenantChange,
  selectedTenant,
  theme,
  toggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open through outside or event
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build searchable commands
  const allItems: CommandItem[] = [
    // Quick Actions
    {
      id: 'action-create',
      category: 'Actions',
      title: 'Create New Support Ticket',
      subtitle: `File ticket under ${selectedTenant.name}`,
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        onClose();
        onOpenCreateTicket();
      },
    },
    {
      id: 'action-critical',
      category: 'Actions',
      title: 'Filter Critical Urgency Tickets',
      subtitle: 'Show high-risk and SLA-sensitive issues',
      icon: <Flame className="w-4 h-4 text-rose-400" />,
      badge: 'Urgent',
      badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      onSelect: () => {
        onClose();
        onNavigateTab('desk');
        onSetPriorityFilter('critical');
      },
    },
    {
      id: 'action-open',
      category: 'Actions',
      title: 'Filter Open Tickets',
      subtitle: 'View pending inbound queries',
      icon: <Inbox className="w-4 h-4 text-blue-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('desk');
        onSetStatusFilter('open');
      },
    },
    {
      id: 'action-theme',
      category: 'Actions',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle application color theme',
      icon: theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      onSelect: () => {
        toggleTheme();
        onClose();
      },
    },

    // Navigation
    {
      id: 'nav-desk',
      category: 'Navigation',
      title: 'Go to Ticket Desk',
      subtitle: 'Real-time multi-tenant ticketing grid',
      icon: <TicketIcon className="w-4 h-4 text-purple-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('desk');
      },
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Go to Executive AI Analytics',
      subtitle: 'Real-time SLA compliance, sentiment & RLHF',
      icon: <BarChart3 className="w-4 h-4 text-cyan-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('analytics');
      },
    },
    {
      id: 'nav-shelf',
      category: 'Navigation',
      title: 'Go to SOP Knowledge Shelf',
      subtitle: 'Grounding standard operating procedures',
      icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('shelf');
      },
    },

    // Tenants
    ...DEFAULT_TENANTS.map((tenant) => ({
      id: `tenant-${tenant.id}`,
      category: 'Tenants' as const,
      title: `Switch to ${tenant.name}`,
      subtitle: `API Key: ${tenant.apiKey.slice(0, 15)}...`,
      icon: <Building2 className="w-4 h-4 text-indigo-400" />,
      badge: selectedTenant.id === tenant.id ? 'Active' : undefined,
      badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      onSelect: () => {
        onTenantChange(tenant);
        onClose();
      },
    })),

    // Matched Tickets
    ...tickets.map((t) => ({
      id: `ticket-${t.id}`,
      category: 'Tickets' as const,
      title: t.subject,
      subtitle: `${t.customer_email} • Status: ${t.status} • Priority: ${t.priority || 'normal'}`,
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      badge: t.priority || undefined,
      badgeStyle: PRIORITY_STYLES[t.priority || 'normal'] || PRIORITY_STYLES.normal,
      onSelect: () => {
        onClose();
        onSelectTicket(t);
      },
    })),
  ];

  // Filter items based on user query
  const q = query.toLowerCase().trim();
  const filteredItems = q
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle?.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      )
    : allItems.slice(0, 14); // show top actions and recent tickets when query empty

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800 bg-[#0b1222]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search tickets, tenants, actions..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto py-2 px-2 flex-1 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching tickets, actions, or tenants found for &ldquo;<span className="text-slate-300">{query}</span>&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition text-xs ${
                    isSelected
                      ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 text-[10px] uppercase font-bold rounded border ${
                              item.badgeStyle || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 bg-[#090e1a] border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300">
                ↓
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300">
                ↵
              </kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[10px]">GoodevaDesk Enterprise</span>
        </div>
      </div>
    </div>
  );
};
