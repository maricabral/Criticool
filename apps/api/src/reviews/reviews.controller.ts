import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { RequestUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import {
  CommentIdParamDto,
  CreateCommentDto,
  CreateReviewDto,
  ReviewCommentsQueryDto,
  ReviewIdParamDto,
  UpdateCommentDto,
  UpdateReviewDto,
  VoteCommentDto,
} from './dto';
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
  get(
    @CurrentUser() user: RequestUser,
    @Param() params: ReviewIdParamDto,
    @Query() query: ReviewCommentsQueryDto,
  ) {
    return this.reviews.get(user.id, params.id, query.commentSort);
  }

  @Post(':id/comments')
  comment(
    @CurrentUser() user: RequestUser,
    @Param() params: ReviewIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.reviews.createComment(user.id, params.id, dto);
  }

  @Post(':id/comments/:commentId/votes')
  voteComment(
    @CurrentUser() user: RequestUser,
    @Param() params: CommentIdParamDto,
    @Body() dto: VoteCommentDto,
  ) {
    return this.reviews.voteComment(user.id, params.id, params.commentId, dto.value);
  }

  @Delete(':id/comments/:commentId/votes')
  removeCommentVote(@CurrentUser() user: RequestUser, @Param() params: CommentIdParamDto) {
    return this.reviews.removeCommentVote(user.id, params.id, params.commentId);
  }

  @Patch(':id/comments/:commentId')
  updateComment(
    @CurrentUser() user: RequestUser,
    @Param() params: CommentIdParamDto,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.reviews.updateComment(user.id, params.id, params.commentId, dto.body);
  }

  @Delete(':id/comments/:commentId')
  deleteComment(@CurrentUser() user: RequestUser, @Param() params: CommentIdParamDto) {
    return this.reviews.deleteComment(user.id, params.id, params.commentId);
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
