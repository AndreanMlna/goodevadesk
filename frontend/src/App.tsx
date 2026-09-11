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
import { Navbar } from './components/Navbar';
import { TenantBanner } from './components/TenantBanner';
import { TicketDesk } from './components/TicketDesk';
import { ExecutiveAnalytics } from './components/ExecutiveAnalytics';
import { TicketDetailModal } from './components/TicketDetailModal';
import { CreateTicketModal } from './components/CreateTicketModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'desk' | 'analytics'>('desk');

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
  const [copiedReply, setCopiedReply] = useState(false);

  const [isApproving, setIsApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nlpAnalysis, setNlpAnalysis] = useState<NlpAnalysisResult | null>(null);

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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newMessage || !newCustomerEmail) return;

    setIsSubmitting(true);
    try {
      const created = await createTicket(apiKey, {
        customer_email: newCustomerEmail,
        subject: newSubject,
        message: newMessage,
      });
      setIsCreateModalOpen(false);
      setNewSubject('');
      setNewMessage('');
      setNewCustomerEmail('');
      await loadTickets();
      setSelectedTicket(created);
    } catch (err: any) {
      alert(`Ticket creation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: TicketStatus) => {
    try {
      const updated = await updateTicketStatus(apiKey, id, newStatus);
      setTickets((prev: Ticket[]) => prev.map((t: Ticket) => (t.id === id ? updated : t)));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleApproveReply = async () => {
    if (!selectedTicket) return;
    setIsApproving(true);
    try {
      const updated = await approveTicketReply(apiKey, selectedTicket.id);
      setSelectedTicket(updated);
      setTickets((prev: Ticket[]) => prev.map((t: Ticket) => (t.id === updated.id ? updated : t)));
      setApprovalSuccess(true);
      setTimeout(() => setApprovalSuccess(false), 3000);
    } catch (err: any) {
      alert(`Reply approval failed: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleFeedback = async (rating: 'thumbs_up' | 'thumbs_down') => {
    if (!selectedTicket) return;
    try {
      await submitTicketFeedback(apiKey, selectedTicket.id, {
        rating,
        notes: feedbackNotes.trim() || undefined,
      });
      setFeedbackSubmitted(rating);
      setShowFeedbackInput(false);
      setFeedbackNotes('');
      setTimeout(() => setFeedbackSubmitted(null), 4000);
    } catch (err: any) {
      alert(`Feedback submission failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!selectedTicket) {
      setNlpAnalysis(null);
      setFeedbackSubmitted(null);
      setShowFeedbackInput(false);
      setFeedbackNotes('');
      return;
    }
    analyzeWithPythonNlp(selectedTicket.subject, selectedTicket.message)
      .then((res) => setNlpAnalysis(res))
      .catch(() => setNlpAnalysis(null));
  }, [selectedTicket]);

  const copySuggestedReply = (reply: string) => {
    navigator.clipboard.writeText(reply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  };

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
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedTenant={selectedTenant}
        onTenantChange={handleTenantChange}
        customApiKey={customApiKey}
        setCustomApiKey={setCustomApiKey}
        onCustomKeySubmit={handleCustomKeySubmit}
        onRefresh={() => {
          if (activeTab === 'desk') loadTickets();
          else loadAnalytics();
        }}
        isLoading={loading || loadingAnalytics}
        criticalCount={stats.critical}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <TenantBanner selectedTenant={selectedTenant} apiKey={apiKey} />

        {activeTab === 'desk' ? (
          <TicketDesk
            filteredTickets={filteredTickets}
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
          />
        ) : (
          <ExecutiveAnalytics
            analyticsData={analyticsData}
            loading={loadingAnalytics}
            error={analyticsError}
            onRetry={loadAnalytics}
            onSelectTicketById={handleSelectTicketById}
          />
        )}
      </main>

      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusUpdate={handleStatusUpdate}
        onApproveReply={handleApproveReply}
        isApproving={isApproving}
        approvalSuccess={approvalSuccess}
        onFeedback={handleFeedback}
        feedbackSubmitted={feedbackSubmitted}
        feedbackNotes={feedbackNotes}
        setFeedbackNotes={setFeedbackNotes}
        showFeedbackInput={showFeedbackInput}
        setShowFeedbackInput={setShowFeedbackInput}
        copiedReply={copiedReply}
        onCopyReply={copySuggestedReply}
        nlpAnalysis={nlpAnalysis}
      />

      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tenantName={selectedTenant.name}
        onSubmit={handleCreateTicket}
        customerEmail={newCustomerEmail}
        setCustomerEmail={setNewCustomerEmail}
        subject={newSubject}
        setSubject={setNewSubject}
        message={newMessage}
        setMessage={setNewMessage}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
