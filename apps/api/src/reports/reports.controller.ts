import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateReportDto } from './dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReportDto) {
    return this.reports.create(user.id, dto);
  }
}
