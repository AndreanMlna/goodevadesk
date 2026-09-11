import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_STOPWORDS,
  TOP_TRENDING_TOPICS_LIMIT,
  CRITICAL_WATCHLIST_LIMIT,
  DEFAULT_CRITICAL_FALLBACK_EMAIL,
  DEFAULT_CRITICAL_WATCHLIST_SCORE,
  DEFAULT_AVERAGE_URGENCY,
} from './analytics.constants';

export interface AnalyticsSummaryResponse {
  organization_id: string;
  total_tickets: number;
  tenant?: {
    organization_id: string;
    name: string;
  };
  metrics?: {
    status_breakdown: Record<string, number>;
    category_breakdown: Record<string, number>;
    priority_breakdown: Record<string, number>;
    sentiment_breakdown: Record<string, number>;
    sla_compliance: {
      breached: number;
      at_risk_urgent: number;
      healthy: number;
      breached_percentage: number;
    };
    avg_urgency_score: number;
  };
  critical_tickets?: Array<{
    id: string;
    subject: string;
    customer_email: string;
    priority: string | null;
    urgency_score: number | null;
    sla_deadline: string | null;
    status: string;
    category: string | null;
  }>;
  knowledge_base?: {
    grounding_sops_count: number;
    available_sops: string[];
  };
  status_breakdown: {
    open: number;
    in_progress: number;
    closed: number;
  };
  category_breakdown: Record<string, number>;
  priority_breakdown: {
    critical: number;
    high: number;
    normal: number;
    low: number;
  };
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    frustrated: number;
    angry: number;
  };
  sla_metrics: {
    sla_compliance_rate_percent: number;
    critical_tickets_count: number;
    breached_tickets_count: number;
  };
  feedback_metrics: {
    total_feedbacks: number;
    thumbs_up: number;
    thumbs_down: number;
    approval_rate_percent: number;
  };
  trending_topics: Array<{ keyword: string; count: number }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates real-time executive analytics for an organization tenant.
   */
  async getSummary(organizationId: string): Promise<AnalyticsSummaryResponse> {
    const [tickets, feedbacks, org] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { organization_id: organizationId },
        select: {
          id: true,
          customer_email: true,
          category: true,
          status: true,
          priority: true,
          sentiment: true,
          urgency_score: true,
          sla_deadline: true,
          created_at: true,
          subject: true,
          message: true,
        },
      }),
      this.prisma.ticketFeedback.findMany({
        where: { organization_id: organizationId },
        select: {
          rating: true,
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
    ]);

    const totalTickets = tickets.length;
    const now = new Date();

    const {
      statusBreakdown,
      categoryBreakdown,
      priorityBreakdown,
      sentimentBreakdown,
      breachedCount,
      criticalCount,
    } = this.computeBreakdowns(tickets, now);

    const trendingTopics = this.computeTrendingTopics(tickets);
    const slaMetrics = this.computeSlaMetrics(totalTickets, breachedCount, criticalCount);
    const feedbackMetrics = this.computeFeedbackMetrics(feedbacks);
    const criticalTickets = this.extractCriticalWatchlist(tickets, now);

    const avgUrgency =
      totalTickets === 0
        ? DEFAULT_AVERAGE_URGENCY
        : Math.round(
            (tickets.reduce((sum, t) => sum + (t.urgency_score || 0.5), 0) / totalTickets) * 100,
          );

    const breachedPercentage =
      totalTickets === 0 ? 0 : Math.round((breachedCount / totalTickets) * 100);

    this.logger.log(`Generated Executive Analytics for tenant [${organizationId}] (${totalTickets} tickets)`);

    return {
      organization_id: organizationId,
      total_tickets: totalTickets,
      tenant: {
        organization_id: organizationId,
        name: org?.name || 'Active Tenant',
      },
      metrics: {
        status_breakdown: statusBreakdown,
        category_breakdown: categoryBreakdown,
        priority_breakdown: priorityBreakdown,
        sentiment_breakdown: sentimentBreakdown,
        sla_compliance: {
          breached: breachedCount,
          at_risk_urgent: criticalCount,
          healthy: Math.max(0, totalTickets - breachedCount),
          breached_percentage: breachedPercentage,
        },
        avg_urgency_score: avgUrgency,
      },
      critical_tickets: criticalTickets,
      knowledge_base: {
        grounding_sops_count: 3,
        available_sops: ['SOP-BIL-2026', 'SOP-ENG-2026', 'SOP-GEN-2026'],
      },
      status_breakdown: statusBreakdown,
      category_breakdown: categoryBreakdown,
      priority_breakdown: priorityBreakdown,
      sentiment_breakdown: sentimentBreakdown,
      sla_metrics: slaMetrics,
      feedback_metrics: feedbackMetrics,
      trending_topics: trendingTopics,
    };
  }

  private computeBreakdowns(tickets: any[], now: Date) {
    const statusBreakdown = { open: 0, in_progress: 0, closed: 0 };
    const categoryBreakdown: Record<string, number> = { billing: 0, technical: 0, general: 0 };
    const priorityBreakdown = { critical: 0, high: 0, normal: 0, low: 0 };
    const sentimentBreakdown = { positive: 0, neutral: 0, frustrated: 0, angry: 0 };
    let breachedCount = 0;
    let criticalCount = 0;

    for (const t of tickets) {
      if (t.status in statusBreakdown) {
        statusBreakdown[t.status as keyof typeof statusBreakdown]++;
      }

      const cat = t.category || 'unclassified';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      const prio = (t.priority || 'normal') as keyof typeof priorityBreakdown;
      if (prio in priorityBreakdown) {
        priorityBreakdown[prio]++;
      }
      if (prio === 'critical') {
        criticalCount++;
      }

      if (t.sla_deadline && t.status === 'open' && now > t.sla_deadline) {
        breachedCount++;
      }

      const sent = (t.sentiment || 'neutral') as keyof typeof sentimentBreakdown;
      if (sent in sentimentBreakdown) {
        sentimentBreakdown[sent]++;
      }
    }

    return {
      statusBreakdown,
      categoryBreakdown,
      priorityBreakdown,
      sentimentBreakdown,
      breachedCount,
      criticalCount,
    };
  }

  private computeTrendingTopics(tickets: any[]) {
    const wordCounts: Record<string, number> = {};

    for (const t of tickets) {
      const words = t.subject
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !DEFAULT_STOPWORDS.has(w));

      for (const w of words) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }

    return Object.entries(wordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_TRENDING_TOPICS_LIMIT);
  }

  private computeSlaMetrics(totalTickets: number, breachedCount: number, criticalCount: number) {
    const complianceRate =
      totalTickets === 0
        ? 100
        : Math.round(((totalTickets - breachedCount) / totalTickets) * 1000) / 10;

    return {
      sla_compliance_rate_percent: complianceRate,
      critical_tickets_count: criticalCount,
      breached_tickets_count: breachedCount,
    };
  }

  private computeFeedbackMetrics(feedbacks: any[]) {
    const totalFeedbacks = feedbacks.length;
    const thumbsUp = feedbacks.filter((f) => f.rating === 'thumbs_up').length;
    const thumbsDown = feedbacks.filter((f) => f.rating === 'thumbs_down').length;
    const approvalRate =
      totalFeedbacks === 0 ? 100 : Math.round((thumbsUp / totalFeedbacks) * 1000) / 10;

    return {
      total_feedbacks: totalFeedbacks,
      thumbs_up: thumbsUp,
      thumbs_down: thumbsDown,
      approval_rate_percent: approvalRate,
    };
  }

  private extractCriticalWatchlist(tickets: any[], now: Date) {
    return tickets
      .filter((t) => t.priority === 'critical' || (t.sla_deadline && now > t.sla_deadline))
      .slice(0, CRITICAL_WATCHLIST_LIMIT)
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        customer_email: t.customer_email || DEFAULT_CRITICAL_FALLBACK_EMAIL,
        priority: t.priority,
        urgency_score:
          typeof t.urgency_score === 'number'
            ? Math.round(t.urgency_score * 100)
            : DEFAULT_CRITICAL_WATCHLIST_SCORE,
        sla_deadline: t.sla_deadline ? t.sla_deadline.toISOString() : null,
        status: t.status,
        category: t.category,
      }));
  }
}
