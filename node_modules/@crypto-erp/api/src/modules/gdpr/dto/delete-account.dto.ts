import { IsString, Equals } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @Equals('DELETE MY DATA', { message: 'Confirmation text must be exactly "DELETE MY DATA"' })
  confirmation: string;

  @IsString()
  password: string;
}
