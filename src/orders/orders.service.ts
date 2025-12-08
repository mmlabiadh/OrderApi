import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model, PipelineStage } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { DailyStatsDto } from './dto/daily-stats.dto';
import { TopItemsDto } from './dto/top-items.dto';
import { ListOrdersCursorDto } from './dto/list-orders-cursor.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(dto: CreateOrderDto) {
    const total = dto.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const orderRef = dto.orderRef ?? randomUUID();

    const created = await this.orderModel.create({
      tenantId: dto.tenantId,
      userId: dto.userId,
      status: dto.status,
      items: dto.items,
      total,
      orderRef,
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

  async dailyStats(q: DailyStatsDto) {
    const from = new Date(q.from);
    const to = new Date(q.to);

    const match = {
      tenantId: q.tenantId,
      createdAt: { $gte: from, $lte: to },
      ...(q.status ? { status: q.status } : {}),
    };

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $project: { createdAt: 1, total: 1 } },
      {
        $group: {
          _id: { day: { $dateTrunc: { date: '$createdAt', unit: 'day' } } },
          revenue: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, day: '$_id.day', revenue: 1, count: 1 } },
      { $sort: { day: 1 } },
    ];

    return this.orderModel.aggregate(pipeline).exec();
  }

  async topItems(q: TopItemsDto) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    const limit = q.limit ?? 10;

    const match: {
      tenantId: string;
      createdAt: any;
      status?: 'DRAFT' | 'PAID' | 'CANCELLED';
    } = {
      tenantId: q.tenantId,
      createdAt: { $gte: from, $lte: to },
      ...(q.status ? { status: q.status } : {}),
    };

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $project: { items: 1 } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.sku',
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          lines: { $sum: 1 },
        },
      },
      { $project: { _id: 0, sku: '$_id', qty: 1, revenue: 1, lines: 1 } },
      { $sort: { revenue: -1 as const } },
      { $limit: limit },
    ];

    return this.orderModel.aggregate(pipeline).exec();
  }

  async explainList(q: ListOrdersDto) {
    const filter: FilterQuery<OrderDocument> = {};
    if (q.tenantId) filter.tenantId = q.tenantId;
    if (q.userId) filter.userId = q.userId;
    if (q.status) filter.status = q.status;

    const limit = q.limit ?? 20;

    return this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .explain('executionStats');
  }

  async listCursor(q: ListOrdersCursorDto) {
    const filter: FilterQuery<OrderDocument> = {};
    if (q.tenantId) filter.tenantId = q.tenantId;
    if (q.userId) filter.userId = q.userId;
    if (q.status) filter.status = q.status;

    const limit = q.limit ?? 20;

    if (q.cursorCreatedAt && q.cursorId) {
      const cDate = new Date(q.cursorCreatedAt);
      const cId = new mongoose.Types.ObjectId(q.cursorId);

      filter.$or = [
        { createdAt: { $lt: cDate } },
        { createdAt: cDate, _id: { $lt: cId } },
      ];
    }

    type OrderCursorRow = { _id: mongoose.Types.ObjectId; createdAt: Date };

    const rows = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean<OrderCursorRow[]>()
      .exec();

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;

    const nextCursor = hasNext
      ? {
          cursorCreatedAt: page[page.length - 1].createdAt.toISOString(),
          cursorId: String(page[page.length - 1]._id),
        }
      : null;

    return { page, nextCursor };
  }
}
