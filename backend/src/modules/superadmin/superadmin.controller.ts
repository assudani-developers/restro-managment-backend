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

  @Post('restaurants')
  createRestaurant(
    @CurrentUser() user: SessionUser,
    @Body()
    body: {
      restaurantName: string;
      branchName?: string;
      ownerName: string;
      ownerEmail: string;
      ownerPassword: string;
      plan?: string;
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

  @Delete('restaurants/:id')
  deleteRestaurant(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    this.assertSuperAdmin(user);
    return this.superAdminService.deleteRestaurant(id);
  }
}

