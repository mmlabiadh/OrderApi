import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(dto: CreateOrderDto) {
    const total = dto.items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const created = await this.orderModel.create({
      tenantId: dto.tenantId,
      userId: dto.userId,
      status: dto.status,
      items: dto.items,
      total,
      createdAt: new Date(),
    });

    return created;
  }

  async list(q: ListOrdersDto) {
    const filter: FilterQuery<OrderDocument> = {};

    if (q.tenantId) filter.tenantId = q.tenantId;
    if (q.userId) filter.userId = q.userId;
    if (q.status) filter.status = q.status;

    const limit = q.limit ?? 20;

    return this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
