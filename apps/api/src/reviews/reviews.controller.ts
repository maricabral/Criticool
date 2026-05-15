import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateReviewDto, ReviewIdParamDto, UpdateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param() params: ReviewIdParamDto) {
    return this.reviews.get(user.id, params.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param() params: ReviewIdParamDto,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(user.id, params.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param() params: ReviewIdParamDto) {
    return this.reviews.softDelete(user.id, params.id);
  }
}
