import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JWTVerifyGetKey } from 'jose';

export type SupabaseAccessTokenClaims = {
  sub: string;
  email: string | null;
};

@Injectable()
export class SupabaseAuthService {
  private remoteJwks: JWTVerifyGetKey | null = null;
  private remoteJwksUrl: string | null = null;

  constructor(private readonly config: ConfigService) {}

  isEnabled() {
    return (this.config.get<string>('AUTH_PROVIDER') ?? 'legacy').trim().toLowerCase() === 'supabase';
  }

  async verifyAccessToken(token: string): Promise<SupabaseAccessTokenClaims> {
    const { jwtVerify } = await import('jose');
    const { payload } = await jwtVerify(token, await this.getRemoteJwks(), {
      audience: this.config.get<string>('SUPABASE_JWT_AUDIENCE') ?? 'authenticated',
      issuer: this.config.get<string>('SUPABASE_JWT_ISSUER') ?? `${this.getSupabaseUrl()}/auth/v1`,
    });

    if (!payload.sub) {
      throw new BadRequestException('Supabase token is missing subject');
    }

    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
    };
  }

  async deleteAuthUser(userId: string) {
    if (!this.isEnabled()) {
      return;
    }

    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      throw new ServiceUnavailableException('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    const response = await fetch(
      `${this.getSupabaseUrl()}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException('Could not delete Supabase auth user');
    }
  }

  private async getRemoteJwks() {
    const jwksUrl = this.getJwksUrl();
    if (!this.remoteJwks || this.remoteJwksUrl !== jwksUrl) {
      const { createRemoteJWKSet } = await import('jose');
      this.remoteJwks = createRemoteJWKSet(new URL(jwksUrl));
      this.remoteJwksUrl = jwksUrl;
    }
    return this.remoteJwks;
  }

  private getJwksUrl() {
    return (
      this.config.get<string>('SUPABASE_JWKS_URL') ??
      `${this.getSupabaseUrl()}/auth/v1/.well-known/jwks.json`
    );
  }

  private getSupabaseUrl() {
    const value = this.config.get<string>('SUPABASE_URL')?.replace(/\/$/, '');
    if (!value) {
      throw new ServiceUnavailableException('SUPABASE_URL is required');
    }
    return value;
  }
}
