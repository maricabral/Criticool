import { IsString } from 'class-validator';

export class NotificationIdParamDto {
  @IsString()
  id: string;
}
