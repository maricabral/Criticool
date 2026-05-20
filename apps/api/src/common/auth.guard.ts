import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { PrismaService } from '../prisma.service';
import { RequestUser } from './auth-user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly supabaseAuth: SupabaseAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      method?: string;
      url?: string;
      originalUrl?: string;
      user?: RequestUser;
    }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    if (this.supabaseAuth.isEnabled()) {
      return this.activateSupabaseRequest(request, token);
    }

    return this.activateLegacyRequest(request, token);
  }

  private async activateSupabaseRequest(
    request: {
      method?: string;
      url?: string;
      originalUrl?: string;
      user?: RequestUser;
    },
    token: string,
  ) {
    try {
      const claims = await this.supabaseAuth.verifyAccessToken(token);
      const user = await this.prisma.user.findFirst({
        where: { id: claims.sub, deletedAt: null },
        select: { id: true, email: true, username: true },
      });
      if (!user) {
        if (this.isBootstrapRequest(request)) {
          request.user = {
            id: claims.sub,
            email: claims.email ?? '',
            username: '',
            profileReady: false,
          };
          return true;
        }
        throw new UnauthorizedException('CritiCool profile setup required');
      }
      request.user = { ...user, profileReady: true };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async activateLegacyRequest(
    request: {
      headers: Record<string, string | undefined>;
      user?: RequestUser;
    },
    token: string,
  ) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-only-access-secret',
      });
      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, username: true },
      });
      if (!user) {
        throw new UnauthorizedException('Invalid access token');
      }
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private isBootstrapRequest(request: { method?: string; url?: string; originalUrl?: string }) {
    const path = (request.originalUrl ?? request.url ?? '').split('?')[0];
    return request.method === 'POST' && path === '/me/bootstrap';
  }
}
