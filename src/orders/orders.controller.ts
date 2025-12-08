import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { OrdersService } from './orders.service';
import { DailyStatsDto } from './dto/daily-stats.dto';
import { TopItemsDto } from './dto/top-items.dto';
import { ListOrdersCursorDto } from './dto/list-orders-cursor.dto';
import type { TenantRequest } from '../common/types/tenant-request.type';
import { TenantGuard } from 'src/common/guards/tenant.guard';

@UseGuards(TenantGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: TenantRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto, req.tenantId);
  }

  @Get()
  list(@Req() req: TenantRequest, @Query() q: ListOrdersDto) {
    return this.ordersService.list({ ...q, tenantId: req.tenantId });
  }

  @Get('stats/daily')
  daily(@Req() req: TenantRequest, @Query() q: DailyStatsDto) {
    return this.ordersService.dailyStats({ ...q, tenantId: req.tenantId });
  }

  @Get('stats/top-items')
  topItems(@Req() req: TenantRequest, @Query() q: TopItemsDto) {
    return this.ordersService.topItems({ ...q, tenantId: req.tenantId });
  }

  @Get('debug/explain/list')
  explainList(@Req() req: TenantRequest, @Query() q: ListOrdersDto) {
    return this.ordersService.explainList({ ...q, tenantId: req.tenantId });
  }

  @Get('cursor')
  listCursor(@Req() req: TenantRequest, @Query() q: ListOrdersCursorDto) {
    return this.ordersService.listCursor({ ...q, tenantId: req.tenantId });
  }
}
