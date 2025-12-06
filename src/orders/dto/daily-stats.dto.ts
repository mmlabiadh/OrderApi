import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class DailyStatsDto {
  @IsString() @IsNotEmpty() tenantId: string;
  @IsISO8601() @IsNotEmpty() from: string;
  @IsISO8601() @IsNotEmpty() to: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status?: 'DRAFT' | 'PAID' | 'CANCELLED';
}
