import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SessionUser } from '@restrocore/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminService } from './superadmin.service';

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
