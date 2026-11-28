import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags } from '@nestjs/swagger';
import {
  menuCategorySchema,
  menuItemSchema,
  modifierGroupSchema,
  setComboComponentsSchema,
  type SessionUser,
} from '@restrocore/types';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BranchAccessService } from '../../common/services/branch-access.service';
import {
  assertValidImageSignature,
  imageUploadOptions,
} from '../../common/upload/image-upload.config';
import { MenuOcrService, type OcrMenuCategory } from './menu-ocr.service';
import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('v1/menu')
export class MenuController {
  constructor(
    private readonly menuService: MenuService,
    private readonly menuOcrService: MenuOcrService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  // --- Categories ---------------------------------------------------------

  @Auth('menu.view')
  @Get('categories')
  async listCategories(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.listCategories(branchId);
  }

  @Auth('menu.manage')
  @Post('categories')
  @UsePipes(new ZodValidationPipe(menuCategorySchema))
  async createCategory(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.createCategory(branchId, body as never);
  }

  @Auth('menu.manage')
  @Patch('categories/:id')
  async updateCategory(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.updateCategory(branchId, id, body as never);
  }

  @Auth('menu.manage')
  @Delete('categories/:id')
  async deleteCategory(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.deleteCategory(branchId, id);
  }

  // --- Kitchen stations -----------------------------------------------------

  @Auth('menu.manage')
  @Get('stations')
  async listStations(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.listStations(branchId);
  }

  @Auth('menu.manage')
  @Post('stations')
  async createStation(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: { name: string; printerName?: string },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.createStation(
      branchId,
      body.name,
      body.printerName,
    );
  }

  // --- Menu items -----------------------------------------------------------

  @Auth('menu.view')
  @Get('items')
  async listItems(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.listItems(branchId, categoryId);
  }

  @Auth('menu.view')
  @Get('items/:id')
  async getItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.getItem(branchId, id);
  }

  @Auth('menu.manage')
  @Post('items')
  @UsePipes(new ZodValidationPipe(menuItemSchema))
  async createItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.createItem(branchId, body as never);
  }

  @Auth('menu.manage')
  @Post('items/upload-image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadItemImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // fileFilter (imageUploadOptions) only saw the client-declared
    // filename/mimetype before any bytes were read — verify the bytes
    // actually on disk match a real image signature before this URL is
    // ever handed back to be saved on a menu item and served publicly.
    assertValidImageSignature(file.path);
    return { url: `/api/uploads/${file.filename}` };
  }

  @Auth('menu.manage')
  @Patch('items/:id')
  async updateItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.updateItem(branchId, id, user.id, body as never);
  }

  @Auth('menu.manage')
  @Delete('items/:id')
  async deleteItem(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.deleteItem(branchId, id);
  }

  // --- Modifier groups --------------------------------------------------------

  @Auth('menu.manage')
  @Get('modifier-groups')
  async listModifierGroups(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.listModifierGroups(branchId);
  }

  @Auth('menu.manage')
  @Post('modifier-groups')
  @UsePipes(new ZodValidationPipe(modifierGroupSchema))
  async createModifierGroup(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.createModifierGroup(branchId, body as never);
  }

  @Auth('menu.manage')
  @Patch('modifier-groups/:id')
  async updateModifierGroup(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.updateModifierGroup(branchId, id, body as never);
  }

  @Auth('menu.manage')
  @Delete('modifier-groups/:id')
  async deleteModifierGroup(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.deleteModifierGroup(branchId, id);
  }

  // --- Combo meals -----------------------------------------------------------

  @Auth('menu.manage')
  @Get('items/:id/combo-components')
  async getComboComponents(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.getComboComponents(branchId, id);
  }

  @Auth('menu.manage')
  @Post('items/:id/combo-components')
  @UsePipes(new ZodValidationPipe(setComboComponentsSchema))
  async setComboComponents(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    const { components } = body as {
      components: { componentItemId: string; quantity: number }[];
    };
    return this.menuService.setComboComponents(branchId, id, components);
  }

  // --- Menu Photo OCR & Bulk Tools -------------------------------------------

  @Auth('menu.manage')
  @Post('ocr/scan')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async scanMenuPhoto(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    if (!file?.buffer) {
      throw new BadRequestException('Please upload a menu image file');
    }
    return this.menuOcrService.scanMenuImage(file.buffer);
  }

  @Auth('menu.manage')
  @Post('ocr/import')
  async importScannedMenu(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body() body: { categories: OcrMenuCategory[] },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    if (!Array.isArray(body?.categories)) {
      throw new BadRequestException('categories array is required');
    }
    return this.menuOcrService.importScannedMenu(branchId, body.categories);
  }

  @Auth('menu.manage')
  @Post('bulk-price')
  async bulkAdjustPrices(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
    @Body()
    body: {
      mode: 'PERCENT' | 'FLAT';
      amount: number;
      categoryId?: string;
      roundTo?: number;
    },
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.bulkAdjustPrices(branchId, body);
  }

  @Auth('menu.view')
  @Get('health')
  async getMenuHealth(
    @CurrentUser() user: SessionUser,
    @Query('branchId') branchId: string,
  ) {
    await this.branchAccess.assertAccess(user.restaurantId, branchId, user.id);
    return this.menuService.getMenuHealth(branchId);
  }

  @Auth('menu.view')
  @Get('design')
  getMenuDesign(@CurrentUser() user: SessionUser) {
    return this.menuService.getMenuDesign(user.restaurantId);
  }

  @Auth('menu.manage')
  @Patch('design')
  updateMenuDesign(
    @CurrentUser() user: SessionUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.menuService.updateMenuDesign(user.restaurantId, body);
  }
}
