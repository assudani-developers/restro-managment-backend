import { Module } from '@nestjs/common';
import { BranchAccessService } from '../../common/services/branch-access.service';
import { NotificationsModule } from '../../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PublicModule } from '../public/public.module';
import { HotelController, HotelPublicController } from './hotel.controller';
import { HotelNotifyService } from './hotel-notify.service';
import { HotelPublicService } from './hotel-public.service';
import { HotelResortService } from './hotel-resort.service';
import { HotelService } from './hotel.service';

@Module({
  imports: [OrdersModule, NotificationsModule, PublicModule],
  controllers: [HotelController, HotelPublicController],
  providers: [HotelService, HotelResortService, HotelNotifyService, HotelPublicService, BranchAccessService],
  exports: [HotelService],
})
export class HotelModule {}
