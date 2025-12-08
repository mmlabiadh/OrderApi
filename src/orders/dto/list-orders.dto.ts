import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListOrdersDto {
  @IsOptional() @IsString() userId?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status?: 'DRAFT' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
