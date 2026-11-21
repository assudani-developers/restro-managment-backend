import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@restrocore/types';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminService } from './superadmin.service';

const SESSION_COOKIE = 'restrocore_session';
const COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function isCookieSecure(): boolean {
  return process.env.COOKIE_SECURE === 'true';
}

@ApiTags('superadmin')
@Controller('v1/superadmin')
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@UseGuards(JwtAuthGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  private assertSuperAdmin(user: SessionUser) {
    if (!user.isSuperAdmin && user.roleName !== 'SUPERADMIN') {
      throw new ForbiddenException('Access denied: SuperAdmin platform privileges required');
    }
  }

  @Get('overview')
  getOverview(@CurrentUser() user: SessionUser) {
    this.assertSuperAdmin(user);
    return this.superAdminService.getPlatformOverview();
  }

  @Get('restaurants')
  getAllRestaurants(@CurrentUser() user: SessionUser) {
    this.assertSuperAdmin(user);
    return this.superAdminService.getAllRestaurants();
  }

  @Get('crm')
  getTenantCrm(@CurrentUser() user: SessionUser) {
    this.assertSuperAdmin(user);
    return this.superAdminService.getTenantCrm();
  }

  @Get('subscriptions')
  getSubscriptions(@CurrentUser() user: SessionUser) {
    this.assertSuperAdmin(user);
    return this.superAdminService.getSubscriptions();
  }

  @Post('restaurants')
  createRestaurant(
    @CurrentUser() user: SessionUser,
    @Body()
    body: {
      restaurantName: string;
      legalName?: string;
      currency?: string;
      timezone?: string;
      branchName?: string;
      branchAddress?: string;
      branchPhone?: string;
      gstNumber?: string;
      country?: string;
      tableCount?: number;
      kitchenStations?: string[];
      ownerName: string;
      ownerEmail: string;
      ownerPassword: string;
      ownerPhone?: string;
      plan?: string;
      businessType?: 'CAFE_QSR' | 'RESTAURANT' | 'CLOUD_KITCHEN' | 'HOTEL' | 'RESORT' | 'CHAIN';
      enabledModules?: string[];
    },
  ) {
    this.assertSuperAdmin(user);
    return this.superAdminService.createRestaurant(body);
  }

  @Post('restaurants/:id/switch')
  async switchRestaurant(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertSuperAdmin(user);
    const result = await this.superAdminService.switchRestaurant(user.id, id);
    res.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isCookieSecure(),
      maxAge: COOKIE_MAX_AGE_MS,
    });
    return result;
  }

  @Post('switch-back')
  async switchBack(
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.assertSuperAdmin(user);
    const result = await this.superAdminService.switchBack(user.id);
    res.cookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isCookieSecure(),
      maxAge: COOKIE_MAX_AGE_MS,
    });
    return { ok: true };
  }

  @Patch('restaurants/:id/toggle')
  toggleStatus(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    return this.superAdminService.toggleRestaurantStatus(id);
  }

  @Patch('restaurants/:id')
  updateRestaurant(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      legalName?: string;
      plan?: string;
      currency?: string;
      timezone?: string;
      upiVpa?: string;
      upiPayeeName?: string;
      isActive?: boolean;
      businessType?: 'CAFE_QSR' | 'RESTAURANT' | 'CLOUD_KITCHEN' | 'HOTEL' | 'RESORT' | 'CHAIN';
      enabledModules?: string[];
    },
  ) {
    this.assertSuperAdmin(user);
    return this.superAdminService.updateRestaurant(id, body);
  }

  @Post('restaurants/:id/branches')
  addBranch(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      address?: string;
      phone?: string;
      gstNumber?: string;
    },
  ) {
    this.assertSuperAdmin(user);
    return this.superAdminService.addBranch(id, body);
  }

  @Patch('branches/:branchId')
  updateBranch(
    @CurrentUser() user: SessionUser,
    @Param('branchId') branchId: string,
    @Body()
    body: {
      name?: string;
      address?: string;
      phone?: string;
      gstNumber?: string;
      isActive?: boolean;
    },
  ) {
    this.assertSuperAdmin(user);
    return this.superAdminService.updateBranch(branchId, body);
  }

  @Patch('restaurants/:id/owner')
  updateOwner(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    },
  ) {
    this.assertSuperAdmin(user);
    return this.superAdminService.updateOwner(id, body);
  }

  @Get('config')
  getConfig(@CurrentUser() user: SessionUser) {
    this.assertSuperAdmin(user);
    return this.superAdminService.getPlatformConfig();
  }

  @Patch('config')
  updateConfig(@CurrentUser() user: SessionUser, @Body() body: any) {
    this.assertSuperAdmin(user);
    return this.superAdminService.updatePlatformConfig(body);
  }

  @Delete('restaurants/:id')
  deleteRestaurant(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    return this.superAdminService.deleteRestaurant(id);
  }
}

