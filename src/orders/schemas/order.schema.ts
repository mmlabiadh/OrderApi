import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export type OrderStatus = 'DRAFT' | 'PAID' | 'CANCELLED';

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ required: true }) sku: string;
  @Prop({ required: true, min: 0 }) price: number;
  @Prop({ required: true, min: 1 }) qty: number;
}

const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  status: OrderStatus;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: false }) // on reste permissif pour les vieux docs
  orderRef?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Index filtre + tri: find({tenantId,userId,status}).sort({createdAt:-1})
OrderSchema.index({ tenantId: 1, userId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, status: 1, createdAt: 1 });
