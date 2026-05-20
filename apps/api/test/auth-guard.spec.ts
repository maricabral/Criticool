import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../src/common/auth.guard';

function mockContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  it('allows Supabase-authenticated profile bootstrap before the app user exists', async () => {
    const request = {
      method: 'POST',
      url: '/me/bootstrap',
      headers: { authorization: 'Bearer supabase-token' },
    };
    const prisma = { user: { findFirst: vi.fn().mockResolvedValue(null) } };
    const guard = new AuthGuard(
      { verifyAsync: vi.fn() } as never,
      { get: vi.fn() } as never,
      prisma as never,
      {
        isEnabled: () => true,
        verifyAccessToken: vi.fn().mockResolvedValue({
          sub: '00000000-0000-0000-0000-000000000001',
          email: 'alice@example.com',
        }),
      } as never,
    );

    await expect(guard.canActivate(mockContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'alice@example.com',
        username: '',
        profileReady: false,
      },
    });
  });

  it('requires profile bootstrap for other protected Supabase requests', async () => {
    const request = {
      method: 'GET',
      url: '/feed',
      headers: { authorization: 'Bearer supabase-token' },
    };
    const prisma = { user: { findFirst: vi.fn().mockResolvedValue(null) } };
    const guard = new AuthGuard(
      { verifyAsync: vi.fn() } as never,
      { get: vi.fn() } as never,
      prisma as never,
      {
        isEnabled: () => true,
        verifyAccessToken: vi.fn().mockResolvedValue({
          sub: '00000000-0000-0000-0000-000000000001',
          email: 'alice@example.com',
        }),
      } as never,
    );

    await expect(guard.canActivate(mockContext(request))).rejects.toThrow(
      'CritiCool profile setup required',
    );
  });

  it('keeps the legacy JWT path available by default', async () => {
    const request = {
      headers: { authorization: 'Bearer legacy-token' },
    };
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1' }),
    };
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
        }),
      },
    };
    const guard = new AuthGuard(
      jwt as never,
      { get: vi.fn().mockReturnValue('secret') } as never,
      prisma as never,
      { isEnabled: () => false } as never,
    );

    await expect(guard.canActivate(mockContext(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('legacy-token', { secret: 'secret' });
    expect(request).toMatchObject({
      user: {
        id: 'user-1',
        email: 'alice@example.com',
        username: 'alice',
      },
    });
  });

  it('rejects requests without a bearer token', async () => {
    const guard = new AuthGuard(
      { verifyAsync: vi.fn() } as never,
      { get: vi.fn() } as never,
      { user: { findFirst: vi.fn() } } as never,
      { isEnabled: () => false } as never,
    );

    await expect(guard.canActivate(mockContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
