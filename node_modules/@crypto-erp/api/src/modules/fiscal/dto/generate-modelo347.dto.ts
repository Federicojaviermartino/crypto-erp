import { IsInt, Min, Max } from 'class-validator';

export class GenerateModelo347Dto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  fiscalYear: number;
}
