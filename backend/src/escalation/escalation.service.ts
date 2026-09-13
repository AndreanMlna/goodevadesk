import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class EscalationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EscalationService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {}

  onModuleInit() {
    // Run an initial check 5s after startup, then every 60s
    setTimeout(() => {
      this.evaluateSlaEscalations().catch((err) =>
        this.logger.warn(`Initial SLA escalation scan error: ${err.message}`),
      );
    }, 5000);

    this.timer = setInterval(() => {
      this.evaluateSlaEscalations().catch((err) =>
        this.logger.warn(`Periodic SLA escalation scan error: ${err.message}`),
      );
    }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Scans active tickets and automatically escalates priority when nearing or breaching SLA deadlines.
   */
  async evaluateSlaEscalations(tenantOrgId?: string): Promise<{
    scanned: number;
    escalated: number;
    details: Array<{ ticketId: string; oldPriority: string; newPriority: string; reason: string }>;
  }> {
    const now = new Date();
    const whereClause: any = {
      status: { not: 'closed' },
      sla_deadline: { not: null },
    };

    if (tenantOrgId) {
      whereClause.organization_id = tenantOrgId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where: whereClause,
      take: 100,
    });

    const details: Array<{ ticketId: string; oldPriority: string; newPriority: string; reason: string }> = [];

    for (const ticket of tickets) {
      if (!ticket.sla_deadline) continue;

      const timeRemainingMs = ticket.sla_deadline.getTime() - now.getTime();
      const currentPriority = (ticket.priority || 'normal').toLowerCase();
      let targetPriority: string | null = null;
      let reason = '';
      let webhookEvent: 'sla_breached' | 'sla_escalated' | null = null;

      // 1. If SLA already breached
      if (timeRemainingMs <= 0) {
        if (currentPriority !== 'critical') {
          targetPriority = 'critical';
          reason = 'SLA deadline breached';
          webhookEvent = 'sla_breached';
        }
      }
      // 2. If SLA within 30 minutes (Urgent Near Breach)
      else if (timeRemainingMs <= 30 * 60 * 1000) {
        if (currentPriority !== 'critical') {
          targetPriority = 'critical';
          reason = 'SLA near breach (< 30m remaining)';
          webhookEvent = 'sla_escalated';
        }
      }
      // 3. If SLA within 2 hours (Approaching Warning)
      else if (timeRemainingMs <= 2 * 60 * 60 * 1000) {
        if (currentPriority === 'normal' || currentPriority === 'low') {
          targetPriority = 'high';
          reason = 'SLA warning (< 2h remaining)';
          webhookEvent = 'sla_escalated';
        }
      }

      if (targetPriority && targetPriority !== currentPriority) {
        // Update ticket in database
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { priority: targetPriority },
        });

        // Record immutable audit log
        try {
          if ((this.prisma as any).auditLog) {
            await (this.prisma as any).auditLog.create({
              data: {
                organization_id: ticket.organization_id,
                ticket_id: ticket.id,
                actor_name: 'SLA Auto-Escalation Engine',
                action: 'sla_escalated',
                details: `Auto-escalated priority from [${currentPriority}] to [${targetPriority}] (${reason})`,
              },
            });
          }
        } catch (auditErr: any) {
          this.logger.warn(`Could not write escalation audit log: ${auditErr?.message}`);
        }

        // Trigger outbound webhook if event matches
        if (webhookEvent) {
          this.webhooksService
            .dispatchAlert(ticket.organization_id, webhookEvent, {
              ...ticket,
              priority: targetPriority,
            })
            .catch((wErr) => this.logger.warn(`Webhook alert failed: ${wErr?.message}`));
        }

        details.push({
          ticketId: ticket.id,
          oldPriority: currentPriority,
          newPriority: targetPriority,
          reason,
        });

        this.logger.log(`⚡ Auto-escalated ticket [${ticket.id}] to [${targetPriority}] (${reason})`);
      }
    }

    return {
      scanned: tickets.length,
      escalated: details.length,
      details,
    };
  }
}
