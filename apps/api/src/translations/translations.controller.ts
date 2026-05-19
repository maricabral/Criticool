import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { TranslateTargetDto } from './dto';
import { TranslationsService } from './translations.service';

@Controller('translations')
@UseGuards(AuthGuard)
export class TranslationsController {
  constructor(private readonly translations: TranslationsService) {}

  @Post()
  translate(@CurrentUser() user: RequestUser, @Body() dto: TranslateTargetDto) {
    return this.translations.translate(user.id, dto);
  }
}
