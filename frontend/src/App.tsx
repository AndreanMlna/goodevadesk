import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  TicketStatus,
  OrganizationTenant,
  NlpAnalysisResult,
  AnalyticsSummaryResponse,
} from './types';
import {
  fetchTickets,
  createTicket,
  updateTicketStatus,
  analyzeWithPythonNlp,
  fetchAnalyticsSummary,
  approveTicketReply,
  submitTicketFeedback,
} from './api';
import { DEFAULT_TENANTS } from './constants';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { SettingsModal } from './components/SettingsModal';
import { TicketDesk } from './components/TicketDesk';
import { ExecutiveAnalytics } from './components/ExecutiveAnalytics';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CreateTicketModal } from './components/CreateTicketModal';
import { KnowledgeShelfView } from './components/KnowledgeShelfView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  const [activeTab, setActiveTab] = useState<'desk' | 'analytics' | 'shelf'>('desk');

  const [selectedTenant, setSelectedTenant] = useState<OrganizationTenant>(DEFAULT_TENANTS[0]);
  const [customApiKey, setCustomApiKey] = useState('');
  const [apiKey, setApiKey] = useState<string>(DEFAULT_TENANTS[0].apiKey);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [nlpAnalysis, setNlpAnalysis] = useState<NlpAnalysisResult | null>(null);
  const [loadingNlp, setLoadingNlp] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('goodevadesk_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('goodevadesk_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Global keyboard shortcut: Ctrl+K / Cmd+K to open Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets(apiKey, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        search: searchQuery || undefined,
      });
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Error connecting to GoodevaDesk API');
    } finally {
      setLoading(false);
    }
  }, [apiKey, statusFilter, categoryFilter, searchQuery]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    try {
      const data = await fetchAnalyticsSummary(apiKey);
      setAnalyticsData(data);
    } catch (err: any) {
      setAnalyticsError(err.message || 'Failed to load executive analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [apiKey]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  const handleTenantChange = (tenant: OrganizationTenant) => {
    setSelectedTenant(tenant);
    setApiKey(tenant.apiKey);
    setSelectedTicket(null);
  };

  const handleCustomKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customApiKey.trim()) return;
    const customTenant: OrganizationTenant = {
      id: 'custom',
      name: 'Custom Tenant',
      apiKey: customApiKey.trim(),
      badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    };
    setSelectedTenant(customTenant);
    setApiKey(customApiKey.trim());
  };

  const handleCreateTicket = async (ticketData: {
    customer_email: string;
    subject: string;
    message: string;
  }) => {
    try {
      const created = await createTicket(apiKey, ticketData);
      setIsCreateModalOpen(false);
      await loadTickets();
      setSelectedTicket(created);
    } catch (err: any) {
      alert(`Ticket creation failed: ${err.message}`);
      throw err;
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: TicketStatus) => {
    // Optimistic UI Update: Immediate 0ms local state reflection
    const prevTickets = [...tickets];
    const prevSelected = selectedTicket ? { ...selectedTicket } : null;

    setTickets((prev: Ticket[]) =>
      prev.map((t: Ticket) => (t.id === id ? { ...t, status: newStatus } : t))
    );
    if (selectedTicket?.id === id) {
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const updated = await updateTicketStatus(apiKey, id, newStatus);
      // Reconcile with authoritative server response
      setTickets((prev: Ticket[]) => prev.map((t: Ticket) => (t.id === id ? updated : t)));
      if (selectedTicket?.id === id) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...updated } : null));
      }
    } catch (err: any) {
      // Rollback on failure
      setTickets(prevTickets);
      if (prevSelected) setSelectedTicket(prevSelected);
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleApproveReply = async () => {
    if (!selectedTicket) return;
    const updated = await approveTicketReply(apiKey, selectedTicket.id);
    setSelectedTicket(updated);
    setTickets((prev: Ticket[]) => prev.map((t: Ticket) => (t.id === updated.id ? updated : t)));
  };

  const handleFeedback = async (rating: 'thumbs_up' | 'thumbs_down', notes?: string) => {
    if (!selectedTicket) return;
    await submitTicketFeedback(apiKey, selectedTicket.id, {
      rating,
      notes,
    });
  };

  useEffect(() => {
    if (!selectedTicket) {
      setNlpAnalysis(null);
      setLoadingNlp(false);
      return;
    }
    setLoadingNlp(true);
    analyzeWithPythonNlp(
      selectedTicket.subject,
      selectedTicket.message,
      selectedTicket.customer_email,
    )
      .then((res) => setNlpAnalysis(res))
      .catch(() => setNlpAnalysis(null))
      .finally(() => setLoadingNlp(false));
  }, [selectedTicket]);

  const filteredTickets = tickets.filter((t) => {
    if (priorityFilter === 'all') return true;
    return (t.priority || 'normal') === priorityFilter;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter((t: Ticket) => t.status === 'open').length,
    in_progress: tickets.filter((t: Ticket) => t.status === 'in_progress').length,
    closed: tickets.filter((t: Ticket) => t.status === 'closed').length,
    critical: tickets.filter((t: Ticket) => t.priority === 'critical').length,
  };

  // Urgent alerts for notification bell: only active, unresolved tickets with critical priority OR breached SLA
  const now = new Date();
  const urgentAlertTickets = tickets.filter(
    (t) =>
      t.status !== 'closed' &&
      ((t.priority || 'normal') === 'critical' ||
        Boolean(t.sla_deadline && now > new Date(t.sla_deadline)))
  );

  const handleSelectTicketById = async (id: string) => {
    const found = tickets.find((tk) => tk.id === id);
    if (found) {
      setSelectedTicket(found);
    } else {
      const freshTickets = await fetchTickets(apiKey);
      const match = freshTickets.find((x) => x.id === id);
      if (match) setSelectedTicket(match);
    }
  };

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        theme === 'light' ? 'bg-[#f1f5f9] text-slate-900' : 'bg-[#0b1120] text-slate-100'
      } selection:bg-blue-600/30 selection:text-blue-200`}
    >
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedTenant={selectedTenant}
        onTenantChange={handleTenantChange}
        tenants={DEFAULT_TENANTS}
        openTicketCount={stats.open}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        theme={theme}
      />

      {/* 2. RIGHT MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col min-w-0 overflow-y-auto h-screen ${
          theme === 'light' ? 'bg-[#f1f5f9]' : 'bg-[#0b1120]'
        }`}
      >
        <HeaderBar
          activeTab={activeTab}
          selectedTenant={selectedTenant}
          ticketCount={tickets.length}
          criticalCount={urgentAlertTickets.length}
          criticalTickets={urgentAlertTickets}
          onSelectTicket={setSelectedTicket}
          onFilterCritical={() => {
            setActiveTab('desk');
            setPriorityFilter('critical');
          }}
          onRefresh={() => {
            if (activeTab === 'desk') loadTickets();
            else if (activeTab === 'analytics') loadAnalytics();
          }}
          isLoading={loading || loadingAnalytics}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-6 max-w-7xl w-full mx-auto">
          {activeTab === 'desk' && (
            <TicketDesk
              filteredTickets={filteredTickets}
              allTickets={tickets}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              stats={stats}
              onSelectTicket={setSelectedTicket}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onRetry={loadTickets}
              onNavigateToShelf={() => setActiveTab('shelf')}
            />
          )}

          {activeTab === 'analytics' && (
            <ExecutiveAnalytics
              apiKey={apiKey}
              analyticsData={analyticsData}
              loading={loadingAnalytics}
              error={analyticsError}
              onRetry={loadAnalytics}
              onSelectTicketById={handleSelectTicketById}
            />
          )}

          {activeTab === 'shelf' && <KnowledgeShelfView apiKey={apiKey} />}
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION BAR (FIXED ON MOBILE < md) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openTicketCount={stats.open}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onQuickAiTriage={() => {
          setActiveTab('desk');
          setCategoryFilter('all');
          setPriorityFilter('critical');
        }}
        theme={theme}
      />

      {/* 4. MODAL DIALOGS */}
      <TicketDetailModal
        ticket={selectedTicket}
        apiKey={apiKey}
        onClose={() => setSelectedTicket(null)}
        onStatusUpdate={handleStatusUpdate}
        onApproveReply={handleApproveReply}
        onFeedback={handleFeedback}
        onTicketUpdated={(updated) => {
          setSelectedTicket(updated);
          setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        nlpAnalysis={nlpAnalysis}
        loadingNlp={loadingNlp}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tickets={tickets}
        onSelectTicket={(t) => {
          setSelectedTicket(t);
          setActiveTab('desk');
        }}
        onOpenCreateTicket={() => setIsCreateModalOpen(true)}
        onNavigateTab={setActiveTab}
        onSetStatusFilter={setStatusFilter}
        onSetPriorityFilter={setPriorityFilter}
        onTenantChange={handleTenantChange}
        selectedTenant={selectedTenant}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tenantName={selectedTenant.name}
        onSubmit={handleCreateTicket}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        selectedTenant={selectedTenant}
        onTenantChange={handleTenantChange}
        tenants={DEFAULT_TENANTS}
        customApiKey={customApiKey}
        setCustomApiKey={setCustomApiKey}
        onCustomKeySubmit={handleCustomKeySubmit}
        currentApiKey={apiKey}
      />
    </div>
  );
}
