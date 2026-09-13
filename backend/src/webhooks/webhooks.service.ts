import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebhookConfig {
  url: string;
  platform: 'slack' | 'discord' | 'generic';
  enabled: boolean;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly tenantConfigs = new Map<string, WebhookConfig>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Updates or sets tenant-specific webhook configuration.
   */
  setWebhookConfig(organizationId: string, config: WebhookConfig): WebhookConfig {
    this.tenantConfigs.set(organizationId, config);
    this.logger.log(`Updated webhook config for tenant [${organizationId}]: ${config.platform} -> ${config.url.slice(0, 30)}...`);
    return config;
  }

  /**
   * Retrieves active webhook configuration for tenant.
   */
  getWebhookConfig(organizationId: string): WebhookConfig {
    const custom = this.tenantConfigs.get(organizationId);
    if (custom) return custom;

    // Fallback to global environment variables if present
    const envSlack = this.configService.get<string>('SLACK_WEBHOOK_URL');
    const envDiscord = this.configService.get<string>('DISCORD_WEBHOOK_URL');

    if (envSlack) {
      return { url: envSlack, platform: 'slack', enabled: true };
    }
    if (envDiscord) {
      return { url: envDiscord, platform: 'discord', enabled: true };
    }

    return {
      url: '',
      platform: 'slack',
      enabled: false,
    };
  }

  /**
   * Sends an asynchronous, non-blocking outbound webhook alert to Slack, Discord, or generic endpoint.
   */
  async dispatchAlert(
    organizationId: string,
    event: 'critical_ticket' | 'sla_escalated' | 'sla_breached',
    ticket: {
      id: string;
      subject: string;
      customer_email: string;
      priority: string;
      category?: string | null;
      sla_deadline?: Date | string | null;
      urgency_score?: number | null;
    },
  ): Promise<boolean> {
    const config = this.getWebhookConfig(organizationId);
    if (!config || !config.enabled || !config.url) {
      return false;
    }

    const payload = this.formatPayload(config.platform, event, ticket);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Strict 3s timeout

      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        this.logger.log(`Outbound webhook [${event}] delivered to ${config.platform} for ticket [${ticket.id}]`);
        return true;
      } else {
        this.logger.warn(`Webhook responded with HTTP ${res.status} ${res.statusText}`);
        return false;
      }
    } catch (err: any) {
      this.logger.warn(`Non-blocking: Webhook dispatch error (${err.message}). Safe failure, ticket was created.`);
      return false;
    }
  }

  /**
   * Sends a test ping payload to verify webhook connectivity.
   */
  async testWebhook(url: string, platform: 'slack' | 'discord' | 'generic'): Promise<{ success: boolean; message: string }> {
    if (!url) {
      return { success: false, message: 'Webhook URL cannot be empty' };
    }

    const testTicket = {
      id: 'test-ping-12345',
      subject: 'GoodevaDesk Webhook Integration Test',
      customer_email: 'ops@goodevadesk.internal',
      priority: 'critical',
      category: 'technical',
      sla_deadline: new Date(Date.now() + 3600000),
      urgency_score: 0.95,
    };

    const payload = this.formatPayload(platform, 'critical_ticket', testTicket);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, message: `Webhook test successfully received by ${platform}` };
      }
      return { success: false, message: `Webhook destination returned HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { success: false, message: `Connection error: ${err.message}` };
    }
  }

  /**
   * Formats payload into Slack Block Kit or Discord Embeds.
   */
  private formatPayload(
    platform: 'slack' | 'discord' | 'generic',
    event: string,
    ticket: any,
  ) {
    const eventLabels: Record<string, string> = {
      critical_ticket: '🚨 CRITICAL TICKET INBOUND',
      sla_escalated: '⚡ SLA AUTO-ESCALATED (PRIORITY RAISED)',
      sla_breached: '🔥 SLA DEADLINE BREACHED',
    };

    const title = eventLabels[event] || '📢 GOODEVADESK ALERT';
    const slaFormatted = ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : 'N/A';

    if (platform === 'slack') {
      return {
        text: `${title}: ${ticket.subject}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: title,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Subject:*\n${ticket.subject}` },
              { type: 'mrkdwn', text: `*Priority:*\n\`${ticket.priority.toUpperCase()}\`` },
              { type: 'mrkdwn', text: `*Customer:*\n${ticket.customer_email}` },
              { type: 'mrkdwn', text: `*SLA Target:*\n${slaFormatted}` },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*GoodevaDesk Enterprise* • Ticket ID: \`${ticket.id}\``,
              },
            ],
          },
        ],
      };
    }

    if (platform === 'discord') {
      return {
        content: `**${title}**`,
        embeds: [
          {
            title: ticket.subject,
            color: event === 'critical_ticket' ? 15158332 : event === 'sla_breached' ? 10038562 : 15844367,
            fields: [
              { name: 'Priority', value: ticket.priority.toUpperCase(), inline: true },
              { name: 'Category', value: ticket.category || 'general', inline: true },
              { name: 'Customer Email', value: ticket.customer_email, inline: false },
              { name: 'SLA Deadline', value: slaFormatted, inline: true },
              { name: 'Ticket ID', value: ticket.id, inline: true },
            ],
            footer: {
              text: 'GoodevaDesk Enterprise Outbound Alerting',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    // Generic JSON payload
    return {
      event,
      timestamp: new Date().toISOString(),
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        customer_email: ticket.customer_email,
        priority: ticket.priority,
        category: ticket.category,
        sla_deadline: ticket.sla_deadline,
      },
    };
  }
}
