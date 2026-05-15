import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { LoginDto, RegisterDto } from './dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 30;

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

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private refreshExpiry() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    return expiresAt;
  }

  private presentUser(user: Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'avatarUrl' | 'bio'>) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    };
  }
}
