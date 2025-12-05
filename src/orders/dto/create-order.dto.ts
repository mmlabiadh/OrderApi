import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsString() @IsNotEmpty() tenantId: string;
  @IsString() @IsNotEmpty() userId: string;

  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status: 'DRAFT' | 'PAID' | 'CANCELLED';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
