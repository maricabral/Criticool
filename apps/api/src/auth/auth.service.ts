import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountTokenType, Prisma, User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { DeleteMeDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateMeDto } from './dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 30;
const ACCOUNT_TOKEN_BYTES = 32;
const EMAIL_TOKEN_MINUTES = 60;
const PASSWORD_RESET_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta: { deviceName?: string; userAgent?: string; ipAddress?: string }) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const displayName = dto.displayName.trim();

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing?.email === email) {
      throw new ConflictException('Email is already registered');
    }
    if (existing?.username === username) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        displayName,
        accounts: {
          create: {
            provider: 'email',
            providerUserId: email,
            passwordHash,
          },
        },
      },
    });

    return this.issueSession(user, meta);
  }

  async login(dto: LoginDto, meta: { deviceName?: string; userAgent?: string; ipAddress?: string }) {
    const email = dto.email.trim().toLowerCase();
    const account = await this.prisma.authAccount.findUnique({
      where: { provider_providerUserId: { provider: 'email', providerUserId: email } },
      include: { user: true },
    });
    if (!account?.passwordHash || account.user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches = await compare(dto.password, account.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSession(account.user, meta);
  }

  async refresh(refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextRefreshToken = this.createRefreshToken();
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      user: this.presentUser(session.user),
      tokens: {
        accessToken: await this.createAccessToken(session.user),
        refreshToken: nextRefreshToken,
      },
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: this.hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    return this.presentUser(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    const data: Partial<{
      email: string;
      pendingEmail: string | null;
      username: string;
      displayName: string;
      bio: string | null;
      locale: string;
      avatarUrl: string | null;
    }> = {};

    const nextUsername = dto.username?.trim().toLowerCase();
    if (nextUsername && nextUsername !== user.username) {
      const existing = await this.prisma.user.findFirst({
        where: { id: { not: userId }, username: nextUsername },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Username is already taken');
      }
      data.username = nextUsername;
    }

    const nextEmail = dto.email?.trim().toLowerCase();
    if (nextEmail) {
      if (nextEmail === user.email) {
        data.pendingEmail = null;
      } else if (nextEmail !== user.pendingEmail) {
        const existing = await this.prisma.user.findFirst({
          where: {
            id: { not: userId },
            OR: [{ email: nextEmail }, { pendingEmail: nextEmail }],
          },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException('Email is already registered');
        }
        data.pendingEmail = nextEmail;
      }
    }

    if (typeof dto.displayName === 'string') {
      data.displayName = dto.displayName.trim();
    }
    if (dto.bio !== undefined) {
      data.bio = this.optionalText(dto.bio);
    }
    if (typeof dto.locale === 'string') {
      data.locale = dto.locale.trim() || 'en-US';
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = this.optionalText(dto.avatarUrl);
    }

    if (!Object.keys(data).length) {
      return this.presentUser(user);
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return this.presentUser(updated);
  }

  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    if (user.emailVerifiedAt && !user.pendingEmail) {
      return {
        ok: true,
        email: user.email,
        pendingEmail: null,
        emailVerifiedAt: user.emailVerifiedAt.toISOString(),
      };
    }

    const type = user.pendingEmail
      ? AccountTokenType.email_change
      : AccountTokenType.email_verification;
    const email = user.pendingEmail ?? user.email;
    const issued = await this.issueAccountToken(user.id, type, email, EMAIL_TOKEN_MINUTES);

    return this.presentDevTokenResponse({
      ok: true,
      email,
      pendingEmail: user.pendingEmail,
      expiresAt: issued.expiresAt.toISOString(),
      token: issued.token,
    });
  }

  async verifyEmailToken(token: string) {
    const row = await this.findUsableToken(token, [
      AccountTokenType.email_verification,
      AccountTokenType.email_change,
    ]);
    const now = new Date();

    if (row.type === AccountTokenType.email_change) {
      const targetEmail = row.email?.trim().toLowerCase();
      if (!targetEmail || row.user.pendingEmail !== targetEmail) {
        throw new BadRequestException('Email change request is no longer active');
      }

      const existing = await this.prisma.user.findFirst({
        where: {
          id: { not: row.userId },
          OR: [{ email: targetEmail }, { pendingEmail: targetEmail }],
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Email is already registered');
      }

      const [updated] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: row.userId },
          data: { email: targetEmail, pendingEmail: null, emailVerifiedAt: now },
        }),
        this.prisma.authAccount.updateMany({
          where: { userId: row.userId, provider: 'email' },
          data: { providerUserId: targetEmail },
        }),
        this.prisma.accountToken.updateMany({
          where: {
            userId: row.userId,
            consumedAt: null,
            type: { in: [AccountTokenType.email_change, AccountTokenType.email_verification] },
          },
          data: { consumedAt: now },
        }),
      ]);

      return { ok: true, user: this.presentUser(updated) };
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: now },
      }),
      this.prisma.accountToken.update({
        where: { id: row.id },
        data: { consumedAt: now },
      }),
    ]);

    return { ok: true, user: this.presentUser(updated) };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });
    if (!user) {
      return { ok: true };
    }

    const issued = await this.issueAccountToken(
      user.id,
      AccountTokenType.password_reset,
      normalizedEmail,
      PASSWORD_RESET_MINUTES,
    );

    if (!this.devAccountTokensEnabled()) {
      return { ok: true };
    }

    return {
      ok: true,
      expiresAt: issued.expiresAt.toISOString(),
      devToken: issued.token,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const row = await this.findUsableToken(dto.token, [AccountTokenType.password_reset]);
    const passwordHash = await hash(dto.password, 12);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.authAccount.updateMany({
        where: { userId: row.userId, provider: 'email' },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.accountToken.updateMany({
        where: { userId: row.userId, type: AccountTokenType.password_reset, consumedAt: null },
        data: { consumedAt: now },
      }),
    ]);

    return { ok: true };
  }

  async deleteMe(userId: string, dto: DeleteMeDto) {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });
    if (dto.username.trim().toLowerCase() !== user.username) {
      throw new BadRequestException('Username confirmation does not match');
    }

    const account = await this.prisma.authAccount.findUnique({
      where: { provider_providerUserId: { provider: 'email', providerUserId: user.email } },
    });
    if (!account?.passwordHash || !(await compare(dto.currentPassword, account.passwordHash))) {
      throw new UnauthorizedException('Invalid password');
    }

    const [reviews, comments] = await Promise.all([
      this.prisma.review.findMany({ where: { userId }, select: { id: true } }),
      this.prisma.comment.findMany({
        where: { OR: [{ userId }, { review: { userId } }] },
        select: { id: true },
      }),
    ]);
    const reviewIds = reviews.map((review) => review.id);
    const commentIds = comments.map((comment) => comment.id);

    const cleanup: Prisma.PrismaPromise<unknown>[] = [];
    if (reviewIds.length || commentIds.length) {
      cleanup.push(
        this.prisma.translationCache.deleteMany({
          where: {
            OR: [
              ...(reviewIds.length
                ? [{ targetType: 'review', targetId: { in: reviewIds } }]
                : []),
              ...(commentIds.length
                ? [{ targetType: 'comment', targetId: { in: commentIds } }]
                : []),
            ],
          },
        }),
      );
    }

    await this.prisma.$transaction([
      ...cleanup,
      this.prisma.report.deleteMany({
        where: { targetType: 'user', targetId: userId },
      }),
      this.prisma.notification.deleteMany({
        where: { actorId: userId },
      }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { ok: true };
  }

  private async issueSession(
    user: User,
    meta: { deviceName?: string; userAgent?: string; ipAddress?: string },
  ) {
    const refreshToken = this.createRefreshToken();
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        deviceName: meta.deviceName,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      user: this.presentUser(user),
      tokens: {
        accessToken: await this.createAccessToken(user),
        refreshToken,
      },
    };
  }

  private async createAccessToken(user: Pick<User, 'id' | 'email' | 'username'>) {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, username: user.username },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-only-access-secret',
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );
  }

  private createRefreshToken() {
    return randomBytes(48).toString('base64url');
  }

  private createAccountToken() {
    return randomBytes(ACCOUNT_TOKEN_BYTES).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private hashAccountToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    return expiresAt;
  }

  private accountTokenExpiry(minutes: number) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
    return expiresAt;
  }

  private async issueAccountToken(
    userId: string,
    type: AccountTokenType,
    email: string,
    ttlMinutes: number,
  ) {
    const token = this.createAccountToken();
    const expiresAt = this.accountTokenExpiry(ttlMinutes);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.accountToken.updateMany({
        where: { userId, type, consumedAt: null },
        data: { consumedAt: now },
      }),
      this.prisma.accountToken.create({
        data: {
          userId,
          type,
          email,
          tokenHash: this.hashAccountToken(token),
          expiresAt,
        },
      }),
    ]);

    return { token, expiresAt };
  }

  private async findUsableToken(token: string, types: AccountTokenType[]) {
    const row = await this.prisma.accountToken.findUnique({
      where: { tokenHash: this.hashAccountToken(token) },
      include: { user: true },
    });
    if (
      !row ||
      !types.includes(row.type) ||
      row.consumedAt ||
      row.expiresAt <= new Date() ||
      row.user.deletedAt
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return row;
  }

  private presentDevTokenResponse<T extends { token?: string }>(response: T) {
    if (this.devAccountTokensEnabled()) {
      const { token, ...rest } = response;
      return { ...rest, devToken: token };
    }
    const { token, ...rest } = response;
    return rest;
  }

  private devAccountTokensEnabled() {
    const value = this.config.get<string>('ACCOUNT_DEV_TOKENS') ?? 'true';
    return value.trim().toLowerCase() !== 'false';
  }

  private optionalText(value: string | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private presentUser(
    user: Pick<
      User,
      | 'id'
      | 'email'
      | 'username'
      | 'displayName'
      | 'avatarUrl'
      | 'bio'
      | 'locale'
      | 'emailVerifiedAt'
      | 'pendingEmail'
    >,
  ) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      locale: user.locale,
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
      pendingEmail: user.pendingEmail,
    };
  }
}
