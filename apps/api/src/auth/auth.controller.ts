import { Body, Controller, Delete, Get, Headers, Ip, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { RequestUser } from '../common/auth-user';
import { AuthService } from './auth.service';
import {
  BootstrapMeDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateMeDto,
  VerifyEmailDto,
} from './dto';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/register')
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
  ) {
    return this.auth.register(dto, { deviceName: dto.deviceName, userAgent, ipAddress });
  }

  @Post('auth/login')
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Ip() ipAddress: string,
  ) {
    return this.auth.login(dto, { deviceName: dto.deviceName, userAgent, ipAddress });
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('auth/logout')
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  @Post('me/bootstrap')
  @UseGuards(AuthGuard)
  bootstrapMe(@CurrentUser() user: RequestUser, @Body() dto: BootstrapMeDto) {
    return this.auth.bootstrapMe(user, dto);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  deleteMe(@CurrentUser() user: RequestUser) {
    return this.auth.deleteMe(user.id);
  }

  @Post('auth/email/verify/request')
  @UseGuards(AuthGuard)
  requestEmailVerification(@CurrentUser() user: RequestUser) {
    return this.auth.requestEmailVerification(user.id);
  }

  @Post('auth/email/verify')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmailToken(dto.token);
  }

  @Post('auth/password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('auth/password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }
}
