import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const NOTIFICATION_TRIGGERS = [
  'BOOKING_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PRE_ARRIVAL',
  'CHECKED_IN',
  'FOOD_ORDERED',
  'FOLIO_UPDATED',
  'CHECKOUT_REMINDER',
  'PAYMENT_COMPLETED',
  'CHECKED_OUT',
  'BOOKING_CANCELLED',
] as const;
export type NotificationTrigger = (typeof NOTIFICATION_TRIGGERS)[number];

const DEFAULT_TEMPLATES: Record<NotificationTrigger, string> = {
  BOOKING_CONFIRMED:
    'Dear {{guestName}},\nYour reservation at {{hotelName}} is confirmed.\nBooking ID: {{bookingCode}}\nRoom Type: {{roomType}}\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\nMeal Plan: {{mealPlan}}\nTotal Amount: {{total}}\nAdvance Paid: {{paid}}\nBalance: {{balance}}\nView booking & hotel facilities: {{link}}\nThank you for choosing {{hotelName}}!',
  PAYMENT_RECEIVED:
    'Dear {{guestName}}, we received {{amount}} for booking {{bookingCode}}. Remaining balance: {{balance}}. Receipt: {{link}}',
  PRE_ARRIVAL:
    'Dear {{guestName}}, we look forward to welcoming you on {{checkIn}}. Check-in from {{checkInTime}}. Location & directions: {{link}}',
  CHECKED_IN:
    'Welcome to {{hotelName}}, {{guestName}}! Room {{room}}. Wi-Fi: {{wifiName}} / {{wifiPassword}}. Your room-service PIN is {{pin}}. Facilities & bill: {{link}}',
  FOOD_ORDERED:
    'Your order {{orderNumber}} for Room {{room}} is in the kitchen. Amount: {{amount}}.',
  FOLIO_UPDATED:
    'Your bill at {{hotelName}} was updated. Current balance: {{balance}}. View & pay: {{link}}',
  CHECKOUT_REMINDER:
    'Dear {{guestName}}, checkout is at {{checkOutTime}} today. Outstanding amount: {{balance}}. Pay online: {{link}}',
  PAYMENT_COMPLETED:
    'Thank you {{guestName}}, your bill for {{bookingCode}} is fully paid. Invoice: {{link}}',
  CHECKED_OUT:
    'Thank you for staying at {{hotelName}}, {{guestName}}. We would love your feedback: {{link}}',
  BOOKING_CANCELLED:
    'Dear {{guestName}}, booking {{bookingCode}} has been cancelled. Refund status: {{refundStatus}}.',
};

@Injectable()
export class HotelNotifyService {
  private readonly logger = new Logger(HotelNotifyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureTemplates(branchId: string) {
    const count = await this.prisma.guestNotificationTemplate.count({ where: { branchId } });
    if (count > 0) return;
    await this.prisma.guestNotificationTemplate.createMany({
      data: NOTIFICATION_TRIGGERS.map((trigger) => ({
        branchId,
        trigger,
        channel: 'WHATSAPP',
        body: DEFAULT_TEMPLATES[trigger],
      })),
      skipDuplicates: true,
    });
  }

  async listTemplates(branchId: string) {
    await this.ensureTemplates(branchId);
    return this.prisma.guestNotificationTemplate.findMany({
      where: { branchId },
      orderBy: { trigger: 'asc' },
    });
  }

  upsertTemplate(
    branchId: string,
    dto: { trigger: string; channel: string; body: string; isActive: boolean },
  ) {
    return this.prisma.guestNotificationTemplate.upsert({
      where: { branchId_trigger_channel: { branchId, trigger: dto.trigger, channel: dto.channel } },
      update: { body: dto.body, isActive: dto.isActive },
      create: { branchId, ...dto },
    });
  }

  listLogs(branchId: string, bookingId?: string) {
    return this.prisma.guestNotificationLog.findMany({
      where: { branchId, ...(bookingId ? { bookingId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async markLog(branchId: string, id: string, status: 'SENT' | 'FAILED') {
    await this.prisma.guestNotificationLog.updateMany({
      where: { id, branchId },
      data: { status, error: null },
    });
    return { ok: true };
  }

  render(body: string, vars: Record<string, string | number | null | undefined>) {
    return body.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
      const v = vars[key];
      return v == null || v === '' ? '-' : String(v);
    });
  }

  /**
   * Renders the trigger's template and records it in the outbox. No messaging
   * provider (WhatsApp Business API / SMS gateway) is wired up, so entries stay
   * QUEUED; staff can send them by hand with one tap (wa.me link) from the
   * booking screen, which marks them SENT. Never throws — a message must not
   * block a booking.
   */
  async dispatch(
    branchId: string,
    trigger: NotificationTrigger,
    booking: { id: string; guestPhone: string | null; guestEmail: string | null; consentMessages: boolean } | null,
    vars: Record<string, string | number | null | undefined>,
    recipientOverride?: string,
  ) {
    try {
      if (booking && !booking.consentMessages) return;
      const recipient = recipientOverride ?? booking?.guestPhone ?? booking?.guestEmail;
      if (!recipient) return;
      await this.ensureTemplates(branchId);
      const templates = await this.prisma.guestNotificationTemplate.findMany({
        where: { branchId, trigger, isActive: true },
      });
      for (const t of templates) {
        await this.prisma.guestNotificationLog.create({
          data: {
            branchId,
            bookingId: booking?.id,
            trigger,
            channel: t.channel,
            recipient,
            body: this.render(t.body, vars),
            status: 'QUEUED',
            error: 'No messaging provider connected — send manually',
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Notification ${trigger} not recorded: ${String(err)}`);
    }
  }
}
