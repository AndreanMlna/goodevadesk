/**
 * Application Insights JavaScript SDK (Web) Telemetry
 * Conforms to guidelines from /applicationinsights-web-ts for Real User Monitoring (RUM).
 * Includes graceful resilient fallback when VITE_APPINSIGHTS_CONNECTION_STRING is unset.
 */

let appInsightsInstance: any = null;
let isInitialized = false;

export async function initTelemetry(): Promise<void> {
  if (isInitialized) return;

  const connectionString = (import.meta as any).env?.VITE_APPINSIGHTS_CONNECTION_STRING;

  if (connectionString && typeof window !== 'undefined') {
    try {
      const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');

      const appInsights = new ApplicationInsights({
        config: {
          connectionString,
          enableAutoRouteTracking: true,
          enableCorsCorrelation: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          distributedTracingMode: 2, // DistributedTracingModes.AI_AND_W3C
          autoTrackPageVisitTime: true,
          disableFetchTracking: false,
          excludeRequestFromAutoTrackingPatterns: [/livemetrics\.azure\.com/i],
        },
      });

      appInsights.loadAppInsights();
      appInsights.trackPageView();
      appInsightsInstance = appInsights;
      isInitialized = true;
      console.log('[Telemetry] Azure Application Insights RUM initialized successfully.');
    } catch (err: any) {
      console.warn('[Telemetry] Could not load @microsoft/applicationinsights-web. Falling back to local RUM logger.', err?.message);
    }
  } else {
    // Local dev mode without Azure connection string
    isInitialized = true;
  }
}

/**
 * Tracks a custom event in Application Insights or dev logger.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, any>,
  measurements?: Record<string, number>,
): void {
  if (appInsightsInstance) {
    appInsightsInstance.trackEvent({ name }, properties, measurements);
  } else if ((import.meta as any).env?.DEV) {
    console.debug(`[Telemetry Event] ${name}:`, properties || {});
  }
}

export const trackTelemetryEvent = trackEvent;

/**
 * Tracks an unhandled exception or error boundary catch.
 */
export function trackException(error: Error, severityLevel: number = 3): void {
  if (appInsightsInstance) {
    appInsightsInstance.trackException({ exception: error, severityLevel });
  } else {
    console.warn(`[Telemetry Exception]:`, error);
  }
}

/**
 * Tracks a page view or view change.
 */
export function trackPageView(name?: string, url?: string): void {
  if (appInsightsInstance) {
    appInsightsInstance.trackPageView({ name, uri: url });
  }
}

// ==============================================================================
// Domain-Specific Business Event Telemetry
// ==============================================================================

export function trackTicketCreated(ticketId: string, priority: string, category?: string | null): void {
  trackEvent('ticket_created', {
    ticket_id: ticketId,
    priority,
    category: category || 'unclassified',
    timestamp: new Date().toISOString(),
  });
}

export function trackAiDraftApproved(ticketId: string): void {
  trackEvent('ai_reply_approved', {
    ticket_id: ticketId,
    timestamp: new Date().toISOString(),
  });
}

export function trackInternalWhisperAdded(ticketId: string): void {
  trackEvent('internal_whisper_added', {
    ticket_id: ticketId,
    timestamp: new Date().toISOString(),
  });
}

export function trackCollisionDetected(ticketId: string, activeAgents: string[]): void {
  trackEvent('collision_detected', {
    ticket_id: ticketId,
    active_agents: activeAgents,
    collision_count: activeAgents.length,
    timestamp: new Date().toISOString(),
  });
}

export function trackSlaEscalated(ticketId: string, newPriority: string): void {
  trackEvent('sla_escalated', {
    ticket_id: ticketId,
    new_priority: newPriority,
    timestamp: new Date().toISOString(),
  });
}
