import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { SessionUser } from '@restrocore/types';
import { z } from 'zod';
import { Auth } from '../../common/decorators/auth.decorator';
import { GEOFENCE_PASS_TTL_MS, geofenceCookieName, issueGeofencePass } from '../../common/geofence-pass';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { HotelNotifyService } from './hotel-notify.service';
import { HotelPublicService } from './hotel-public.service';
import { HotelResortService } from './hotel-resort.service';
import { HotelService } from './hotel.service';
import * as S from './hotel.schemas';

const body = <T extends z.ZodTypeAny>(schema: T) => Body(new ZodValidationPipe(schema));

@ApiTags('hotel')
@Controller('v1/hotel')
export class HotelController {
  constructor(
    private readonly hotel: HotelService,
    private readonly resort: HotelResortService,
    private readonly notify: HotelNotifyService,
    private readonly access: BranchAccessService,
  ) {}

  private async ok(user: SessionUser, branchId: string) {
    await this.access.assertAccess(user.restaurantId, branchId, user.id);
  }

  // ---------------------------------------------------------------- settings / branding / geofence
  @Auth()
  @Get('settings')
  async settings(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.hotel.getSettings(b);
  }

  @Auth('hotel.setup')
  @Patch('settings')
  async updateSettings(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.hotelSettingsSchema) dto: z.infer<typeof S.hotelSettingsSchema>) {
    await this.ok(u, b);
    return this.hotel.updateSettings(b, dto);
  }

  @Auth()
  @Post('geofence/check')
  async geofence(
    @CurrentUser() u: SessionUser,
    @Query('branchId') b: string,
    @body(S.geofenceCheckSchema) dto: z.infer<typeof S.geofenceCheckSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.ok(u, b);
    const r = await this.hotel.geofenceCheck(b, dto.latitude, dto.longitude, dto.accuracy);
    if (r.enforced && r.allowed) {
      res.cookie(geofenceCookieName(b), issueGeofencePass(u.id, b), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: GEOFENCE_PASS_TTL_MS,
        path: '/',
      });
    } else if (r.enforced) {
      res.clearCookie(geofenceCookieName(b), { path: '/' });
    }
    return r;
  }

  // ---------------------------------------------------------------- categories / meal plans / rooms
  @Auth()
  @Get('categories')
  async categories(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.hotel.listCategories(b);
  }
  @Auth('hotel.setup')
  @Post('categories')
  async createCategory(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.roomCategorySchema) dto: z.infer<typeof S.roomCategorySchema>) {
    await this.ok(u, b);
    return this.hotel.createCategory(b, dto);
  }
  @Auth('hotel.setup')
  @Patch('categories/:id')
  async updateCategory(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.roomCategoryUpdateSchema) dto: z.infer<typeof S.roomCategoryUpdateSchema>) {
    await this.ok(u, b);
    return this.hotel.updateCategory(b, id, dto);
  }
  @Auth('hotel.setup')
  @Delete('categories/:id')
  async deleteCategory(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.deleteCategory(b, id);
  }

  @Auth()
  @Get('meal-plans')
  async mealPlans(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.hotel.listMealPlans(b);
  }
  @Auth('hotel.setup')
  @Post('meal-plans')
  async createMealPlan(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.mealPlanSchema) dto: z.infer<typeof S.mealPlanSchema>) {
    await this.ok(u, b);
    return this.hotel.createMealPlan(b, dto);
  }
  @Auth('hotel.setup')
  @Patch('meal-plans/:id')
  async updateMealPlan(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.mealPlanUpdateSchema) dto: z.infer<typeof S.mealPlanUpdateSchema>) {
    await this.ok(u, b);
    return this.hotel.updateMealPlan(b, id, dto);
  }
  @Auth('hotel.setup')
  @Delete('meal-plans/:id')
  async deleteMealPlan(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.deleteMealPlan(b, id);
  }

  @Auth('hotel.setup')
  @Post('rooms')
  async createRoom(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.roomSchema) dto: z.infer<typeof S.roomSchema>) {
    await this.ok(u, b);
    return this.hotel.createRoom(b, dto);
  }
  @Auth('hotel.setup')
  @Post('rooms/bulk')
  async createRooms(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.roomBulkSchema) dto: z.infer<typeof S.roomBulkSchema>) {
    await this.ok(u, b);
    return this.hotel.createRooms(b, dto);
  }
  @Auth('hotel.setup')
  @Patch('rooms/:id')
  async updateRoom(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.roomUpdateSchema) dto: z.infer<typeof S.roomUpdateSchema>) {
    await this.ok(u, b);
    return this.hotel.updateRoom(b, id, dto);
  }
  @Auth('hotel.setup')
  @Post('rooms/:id/rotate-qr')
  async rotateQr(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.rotateRoomQr(b, id);
  }
  @Auth('hotel.setup')
  @Delete('rooms/:id')
  async deleteRoom(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.deleteRoom(b, id);
  }

  // ---------------------------------------------------------------- board & housekeeping
  @Auth()
  @Get('board')
  async board(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.hotel.board(b);
  }
  @Auth('hotel.housekeeping')
  @Patch('rooms/:id/status')
  async roomStatus(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.roomStatusSchema) dto: z.infer<typeof S.roomStatusSchema>) {
    await this.ok(u, b);
    return this.hotel.changeRoomStatus(b, id, dto.status, dto.note, u.id);
  }
  @Auth('hotel.housekeeping')
  @Get('rooms/:id/history')
  async roomHistory(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.roomHistory(b, id);
  }

  // ---------------------------------------------------------------- availability & bookings
  @Auth('hotel.frontdesk')
  @Get('availability')
  async availability(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query('checkIn') ci: string, @Query('checkOut') co: string) {
    await this.ok(u, b);
    return this.hotel.availability(b, ci, co);
  }
  @Auth('hotel.frontdesk')
  @Get('free-rooms')
  async freeRooms(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query('categoryId') c: string, @Query('checkIn') ci: string, @Query('checkOut') co: string, @Query('exclude') ex?: string) {
    await this.ok(u, b);
    return this.hotel.freeRooms(b, c || null, ci, co, ex);
  }
  @Auth('hotel.frontdesk')
  @Post('quote')
  async quote(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.quoteSchema) dto: z.infer<typeof S.quoteSchema>) {
    await this.ok(u, b);
    return this.hotel.quote(b, dto);
  }
  @Auth('hotel.frontdesk')
  @Get('bookings')
  async bookings(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query() q: Record<string, string>) {
    await this.ok(u, b);
    return this.hotel.listBookings(b, q);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings')
  async createBooking(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.bookingSchema) dto: z.infer<typeof S.bookingSchema>) {
    await this.ok(u, b);
    return this.hotel.createBooking(b, u.id, dto);
  }
  @Auth('hotel.frontdesk')
  @Get('bookings/:id')
  async booking(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.getBooking(b, id);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/assign-room')
  async assign(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(z.object({ roomId: z.string().min(1) })) dto: { roomId: string }) {
    await this.ok(u, b);
    return this.hotel.assignRoom(b, id, dto.roomId);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/check-in')
  async checkIn(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.checkInSchema) dto: z.infer<typeof S.checkInSchema>) {
    await this.ok(u, b);
    return this.hotel.checkIn(b, id, u.id, dto);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/check-out')
  async checkOut(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(z.object({ allowDue: z.boolean().default(false) })) dto: { allowDue: boolean }) {
    await this.ok(u, b);
    return this.hotel.checkOut(b, id, u.id, dto.allowDue);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/cancel')
  async cancel(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.cancelSchema) dto: { reason: string }) {
    await this.ok(u, b);
    return this.hotel.cancel(b, id, u.id, dto.reason);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/no-show')
  async noShow(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string) {
    await this.ok(u, b);
    return this.hotel.markNoShow(b, id);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/charges')
  async charge(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.folioChargeSchema) dto: z.infer<typeof S.folioChargeSchema>) {
    await this.ok(u, b);
    return this.hotel.addCharge(b, id, u.id, dto);
  }
  @Auth('hotel.payments')
  @Post('bookings/:id/payments')
  async payment(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.folioPaymentSchema) dto: z.infer<typeof S.folioPaymentSchema>) {
    await this.ok(u, b);
    return this.hotel.addPayment(b, id, u.id, dto);
  }
  @Auth('hotel.frontdesk')
  @Post('bookings/:id/notify')
  async resend(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(z.object({ trigger: z.string() })) dto: { trigger: string }) {
    await this.ok(u, b);
    await this.hotel.notifyBooking(b, id, dto.trigger as never);
    return this.hotel.getBooking(b, id);
  }

  // ---------------------------------------------------------------- room service & room menu
  @Auth('orders.create')
  @Get('room-service')
  async roomService(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.hotel.roomService(b);
  }
  @Auth('orders.edit')
  @Post('orders/:orderId/post-to-folio')
  async postToFolio(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('orderId') id: string, @body(z.object({ bookingId: z.string().optional() })) dto: { bookingId?: string }) {
    await this.ok(u, b);
    return this.hotel.postOrderToFolio(b, id, u.id, dto.bookingId);
  }
  @Auth('menu.view')
  @Get('room-menu')
  async roomMenu(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.hotel.roomMenuItems(b);
  }
  @Auth('menu.manage')
  @Patch('room-menu/:id')
  async updateRoomMenu(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.roomMenuItemSchema) dto: z.infer<typeof S.roomMenuItemSchema>) {
    await this.ok(u, b);
    return this.hotel.updateRoomMenuItem(b, id, dto);
  }

  // ---------------------------------------------------------------- notifications
  @Auth('hotel.frontdesk')
  @Get('notification-templates')
  async templates(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.notify.listTemplates(b);
  }
  @Auth('hotel.setup')
  @Put('notification-templates')
  async saveTemplate(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.templateSchema) dto: z.infer<typeof S.templateSchema>) {
    await this.ok(u, b);
    return this.notify.upsertTemplate(b, dto);
  }
  @Auth('hotel.frontdesk')
  @Get('notification-logs')
  async logs(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query('bookingId') bk?: string) {
    await this.ok(u, b);
    return this.notify.listLogs(b, bk);
  }
  @Auth('hotel.frontdesk')
  @Patch('notification-logs/:id')
  async markLog(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(z.object({ status: z.enum(['SENT', 'FAILED']) })) dto: { status: 'SENT' | 'FAILED' }) {
    await this.ok(u, b);
    return this.notify.markLog(b, id, dto.status);
  }

  // ---------------------------------------------------------------- analytics
  @Auth('dashboard.sales.view')
  @Get('analytics')
  async analytics(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query('from') from: string, @Query('to') to: string) {
    await this.ok(u, b);
    return this.hotel.analytics(b, from, to);
  }

  // ---------------------------------------------------------------- venues & events
  @Auth('hotel.events')
  @Get('venues')
  async venues(@CurrentUser() u: SessionUser, @Query('branchId') b: string) {
    await this.ok(u, b);
    return this.resort.listVenues(b);
  }
  @Auth('hotel.setup')
  @Post('venues')
  async createVenue(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.venueSchema) dto: z.infer<typeof S.venueSchema>) {
    await this.ok(u, b);
    return this.resort.createVenue(b, dto);
  }
  @Auth('hotel.setup')
  @Patch('venues/:id')
  async updateVenue(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.venueUpdateSchema) dto: z.infer<typeof S.venueUpdateSchema>) {
    await this.ok(u, b);
    return this.resort.updateVenue(b, id, dto);
  }
  @Auth('hotel.events')
  @Get('events')
  async events(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query('from') from?: string, @Query('to') to?: string) {
    await this.ok(u, b);
    return this.resort.listEvents(b, from, to);
  }
  @Auth('hotel.events')
  @Post('events')
  async createEvent(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.eventSchema) dto: z.infer<typeof S.eventSchema>) {
    await this.ok(u, b);
    return this.resort.createEvent(b, dto);
  }
  @Auth('hotel.events')
  @Patch('events/:id')
  async updateEvent(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.eventUpdateSchema) dto: z.infer<typeof S.eventUpdateSchema>) {
    await this.ok(u, b);
    return this.resort.updateEvent(b, id, dto);
  }
  @Auth('hotel.events')
  @Post('events/:id/payments')
  async eventPayment(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(S.eventPaymentSchema) dto: z.infer<typeof S.eventPaymentSchema>) {
    await this.ok(u, b);
    return this.resort.addEventPayment(b, id, dto);
  }

  // ---------------------------------------------------------------- pool
  @Auth('hotel.pool')
  @Get('pool')
  async pool(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Query('date') date: string) {
    await this.ok(u, b);
    return this.resort.listPasses(b, date);
  }
  @Auth('hotel.pool')
  @Post('pool')
  async createPass(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @body(S.poolPassSchema) dto: z.infer<typeof S.poolPassSchema>) {
    await this.ok(u, b);
    return this.resort.createPass(b, u.id, dto);
  }
  @Auth('hotel.pool')
  @Patch('pool/:id')
  async passStatus(@CurrentUser() u: SessionUser, @Query('branchId') b: string, @Param('id') id: string, @body(z.object({ status: z.enum(['CHECKED_IN', 'CANCELLED']) })) dto: { status: 'CHECKED_IN' | 'CANCELLED' }) {
    await this.ok(u, b);
    return this.resort.setPassStatus(b, id, dto.status);
  }
}

// Unauthenticated guest endpoints — reachable only by opaque tokens.
@ApiTags('public')
@Controller('v1/public/hotel')
export class HotelPublicController {
  constructor(private readonly pub: HotelPublicService) {}

  @Get('room/:qrToken')
  room(@Param('qrToken') t: string) {
    return this.pub.getRoom(t);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('room/:qrToken/order')
  order(@Param('qrToken') t: string, @body(S.publicRoomOrderSchema) dto: z.infer<typeof S.publicRoomOrderSchema>) {
    return this.pub.createRoomOrder(t, dto);
  }

  @Get('room/:qrToken/orders')
  orders(@Param('qrToken') t: string) {
    return this.pub.roomOrders(t);
  }

  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post('room/:qrToken/request')
  request(@Param('qrToken') t: string, @body(z.object({ kind: z.string().max(30) })) dto: { kind: string }) {
    return this.pub.requestService(t, dto.kind);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('stay/:guestToken')
  stay(@Param('guestToken') t: string) {
    return this.pub.stay(t);
  }
}
