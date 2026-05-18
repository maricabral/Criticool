import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { FeedController } from './feed/feed.controller';
import { FeedService } from './feed/feed.service';
import { FriendshipsController } from './friendships/friendships.controller';
import { FriendshipsService } from './friendships/friendships.service';
import { HealthController } from './health.controller';
import { MoviesController } from './movies/movies.controller';
import { MoviesService } from './movies/movies.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { PrismaService } from './prisma.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsService } from './reviews/reviews.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { VisibilityService } from './visibility/visibility.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({}),
  ],
  controllers: [
    HealthController,
    AuthController,
    MoviesController,
    ReviewsController,
    FriendshipsController,
    FeedController,
    UsersController,
    NotificationsController,
    ReportsController,
  ],
  providers: [
    PrismaService,
    AuthService,
    MoviesService,
    ReviewsService,
    FriendshipsService,
    FeedService,
    UsersService,
    VisibilityService,
    NotificationsService,
    ReportsService,
  ],
})
export class AppModule {}
