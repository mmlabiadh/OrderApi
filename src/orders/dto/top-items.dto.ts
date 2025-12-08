import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class TopItemsDto {
  @IsISO8601()
  @IsNotEmpty()
  from: string;

  @IsISO8601()
  @IsNotEmpty()
  to: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status?: 'DRAFT' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
