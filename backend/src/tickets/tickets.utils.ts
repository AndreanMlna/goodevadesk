import { Prisma, TicketStatus } from '@prisma/client';
import {
  SLA_HOURS_BY_PRIORITY,
  DEFAULT_TICKET_PRIORITY,
  MILLISECONDS_PER_HOUR,
} from './tickets.constants';
import { QueryTicketsDto } from './dto/query-tickets.dto';

/**
 * Pure function: Computes SLA deadline date based on ticket priority level.
 */
export function calculateSlaDeadline(
  priority: string = DEFAULT_TICKET_PRIORITY,
  baseDate: Date = new Date(),
): Date {
  const normalizedPriority = priority ? priority.toLowerCase().trim() : DEFAULT_TICKET_PRIORITY;
  const slaHours =
    SLA_HOURS_BY_PRIORITY[normalizedPriority] ?? SLA_HOURS_BY_PRIORITY[DEFAULT_TICKET_PRIORITY];
  return new Date(baseDate.getTime() + slaHours * MILLISECONDS_PER_HOUR);
}

/**
 * Pure function: Builds a strictly tenant-isolated Prisma where input query.
 * Guarantees that every query is filtered by organization_id.
 */
export function buildTicketWhereClause(
  organizationId: string,
  query?: QueryTicketsDto & { priority?: string },
): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {
    organization_id: organizationId,
  };

  if (!query) return where;

  const { status, category, search, priority } = query;

  if (status) {
    where.status = status;
  }

  if (category && category.trim().length > 0) {
    where.category = {
      equals: category.toLowerCase().trim(),
      mode: 'insensitive',
    };
  }

  if (priority && priority.trim().length > 0) {
    where.priority = priority.toLowerCase().trim();
  }

  if (search && search.trim().length > 0) {
    const searchTerm = search.trim();
    where.OR = [
      { subject: { contains: searchTerm, mode: 'insensitive' } },
      { message: { contains: searchTerm, mode: 'insensitive' } },
      { customer_email: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  return where;
}
