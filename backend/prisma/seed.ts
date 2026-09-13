import { PrismaClient, TicketStatus } from '@prisma/client';

const prisma: any = new PrismaClient();

async function main() {
  console.log('🌱 Starting GoodevaDesk Database Seeding...');

  // 1. Create Organization 1: Acme Corp
  const acme = await prisma.organization.upsert({
    where: { api_key: 'acme_live_key_12345' },
    update: {},
    create: {
      name: 'Acme Corp',
      api_key: 'acme_live_key_12345',
    },
  });

  // 2. Create Organization 2: TechFlow Inc
  const techflow = await prisma.organization.upsert({
    where: { api_key: 'techflow_live_key_67890' },
    update: {},
    create: {
      name: 'TechFlow Inc',
      api_key: 'techflow_live_key_67890',
    },
  });

  console.log(`✅ Organizations seeded:`);
  console.log(`   - Acme Corp: ${acme.id} (API Key: acme_live_key_12345)`);
  console.log(`   - TechFlow Inc: ${techflow.id} (API Key: techflow_live_key_67890)`);

  // 3. Seed Sample Tickets for Acme Corp
  const acmeTicketCount = await prisma.ticket.count({
    where: { organization_id: acme.id },
  });

  if (acmeTicketCount === 0) {
    await prisma.ticket.createMany({
      data: [
        {
          organization_id: acme.id,
          customer_email: 'finance@customer-a.com',
          subject: 'Double charge on invoice #INV-2026-09',
          message: 'Hello, our account was billed twice for the annual enterprise subscription. Please investigate and refund the duplicate payment.',
          category: 'billing',
          suggested_reply: 'Dear Customer, thank you for reaching out. We apologize for the duplicate charge on invoice #INV-2026-09. We have initiated a full refund for the duplicate transaction which should reflect in 3-5 business days.',
          status: TicketStatus.open,
        },
        {
          organization_id: acme.id,
          customer_email: 'dev@partner-b.io',
          subject: 'API 504 Gateway Timeout during webhook dispatch',
          message: 'Our endpoints are receiving intermittent 504 gateway timeout errors when receiving batch webhooks from your service.',
          category: 'technical',
          suggested_reply: 'Hello, thank you for reporting the 504 Gateway Timeout issues with webhook dispatches. Our engineering team is currently investigating server load and retry queue concurrency.',
          status: TicketStatus.in_progress,
        },
        {
          organization_id: acme.id,
          customer_email: 'sarah@designhub.co',
          subject: 'Inquiry regarding custom SLA agreements',
          message: 'We are expanding our deployment and would like to review 24/7 dedicated support options and custom SLA tiers.',
          category: 'general',
          suggested_reply: 'Hi Sarah, thank you for your interest in our custom SLA agreements! I have forwarded your request to our enterprise account executive who will share our dedicated support packages.',
          status: TicketStatus.closed,
        },
      ],
    });
    console.log('✅ Seeded 3 sample tickets for Acme Corp');
  }

  // 4. Seed Sample Tickets for TechFlow Inc
  const techflowTicketCount = await prisma.ticket.count({
    where: { organization_id: techflow.id },
  });

  if (techflowTicketCount === 0) {
    await prisma.ticket.createMany({
      data: [
        {
          organization_id: techflow.id,
          customer_email: 'security@cloudteam.org',
          subject: 'Database migration script syntax error on PG16',
          message: 'Running migration v2.4 against PostgreSQL 16 fails with constraint error on foreign key definitions.',
          category: 'technical',
          suggested_reply: 'Hi Security Team, thank you for reporting the migration issue on PostgreSQL 16. Please make sure you apply the patch published in hotfix v2.4.1 which resolves constraint naming collisions.',
          status: TicketStatus.open,
        },
      ],
    });
    console.log('✅ Seeded 1 sample ticket for TechFlow Inc');
  }

  // 5. Seed Messages and Audit Logs for all tickets if missing
  const allTickets = await prisma.ticket.findMany();
  for (const ticket of allTickets) {
    const msgCount = await prisma.ticketMessage.count({ where: { ticket_id: ticket.id } });
    if (msgCount === 0) {
      // Customer opening message
      await prisma.ticketMessage.create({
        data: {
          ticket_id: ticket.id,
          organization_id: ticket.organization_id,
          sender_type: 'customer',
          sender_name: ticket.customer_email.split('@')[0],
          sender_email: ticket.customer_email,
          content: ticket.message,
          created_at: ticket.created_at,
        },
      });

      // Internal Whisper Note
      await prisma.ticketMessage.create({
        data: {
          ticket_id: ticket.id,
          organization_id: ticket.organization_id,
          sender_type: 'internal_note',
          sender_name: 'Sarah Connor (Tier 2 Lead)',
          content: 'Verified customer account. Running diagnostics on billing gateway logs.',
          created_at: new Date(ticket.created_at.getTime() + 10 * 60 * 1000),
        },
      });

      // If in_progress or closed, add Agent Reply
      if (ticket.status !== TicketStatus.open && ticket.suggested_reply) {
        await prisma.ticketMessage.create({
          data: {
            ticket_id: ticket.id,
            organization_id: ticket.organization_id,
            sender_type: 'agent',
            sender_name: 'Alex Mercer (Support Agent)',
            content: ticket.suggested_reply,
            created_at: new Date(ticket.created_at.getTime() + 25 * 60 * 1000),
          },
        });
      }
    }

    const auditCount = await prisma.auditLog.count({ where: { ticket_id: ticket.id } });
    if (auditCount === 0) {
      await prisma.auditLog.createMany({
        data: [
          {
            ticket_id: ticket.id,
            organization_id: ticket.organization_id,
            actor_name: ticket.customer_email,
            action: 'ticket_created',
            details: `Ticket created with initial priority "${ticket.priority || 'normal'}"`,
            created_at: ticket.created_at,
          },
          {
            ticket_id: ticket.id,
            organization_id: ticket.organization_id,
            actor_name: 'Sarah Connor (Supervisor)',
            action: 'assigned',
            details: 'Assigned ticket to Alex Mercer (Support Agent)',
            created_at: new Date(ticket.created_at.getTime() + 5 * 60 * 1000),
          },
        ],
      });

      // Also assign ticket if null
      if (!ticket.assigned_to) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { assigned_to: 'Alex Mercer (Support Agent)' },
        });
      }
    }
  }
  console.log('✅ Threaded messages and audit logs seeded for all tickets');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
