import { IsIn, IsISO8601, IsNotEmpty, IsOptional } from 'class-validator';

export class DailyStatsDto {
  @IsISO8601() @IsNotEmpty() from: string;
  @IsISO8601() @IsNotEmpty() to: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status?: 'DRAFT' | 'PAID' | 'CANCELLED';
}
