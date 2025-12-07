import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { OrdersService } from './orders.service';
import { DailyStatsDto } from './dto/daily-stats.dto';
import { TopItemsDto } from './dto/top-items.dto';
import { ListOrdersCursorDto } from './dto/list-orders-cursor.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  list(@Query() q: ListOrdersDto) {
    return this.ordersService.list(q);
  }

  @Get('stats/daily')
  daily(@Query() q: DailyStatsDto) {
    return this.ordersService.dailyStats(q);
  }

  @Get('stats/top-items')
  topItems(@Query() q: TopItemsDto) {
    return this.ordersService.topItems(q);
  }

  @Get('debug/explain/list')
  explainList(@Query() q: ListOrdersDto) {
    return this.ordersService.explainList(q);
  }

  @Get('cursor')
  listCursor(@Query() q: ListOrdersCursorDto) {
    return this.ordersService.listCursor(q);
  }
}
