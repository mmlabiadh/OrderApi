import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListOrdersCursorDto {
  @IsOptional() @IsString() userId?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status?: 'DRAFT' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @IsString()
  cursorCreatedAt?: string; // ISO date

  @IsOptional()
  @IsString()
  cursorId?: string; // ObjectId string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
