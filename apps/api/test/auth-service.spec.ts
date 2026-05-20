import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccountTokenType } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';

function createMockPrisma() {
  return {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findFirstOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    authAccount: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    accountToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    review: { findMany: vi.fn() },
    comment: { findMany: vi.fn() },
    translationCache: { deleteMany: vi.fn() },
    report: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    $transaction: vi.fn((operations: unknown[]) => Promise.all(operations)),
  };
}

function createMockJwt() {
  return {
    signAsync: vi.fn().mockResolvedValue('mock-access-token'),
  };
}

function createMockConfig() {
  return {
    get: vi.fn().mockReturnValue('test-secret'),
  };
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let jwt: ReturnType<typeof createMockJwt>;
  let config: ReturnType<typeof createMockConfig>;
  let service: AuthService;

  beforeEach(() => {
    prisma = createMockPrisma();
    jwt = createMockJwt();
    config = createMockConfig();
    service = new AuthService(prisma as never, jwt as never, config as never);
  });

  describe('register', () => {
    const dto = {
      email: 'alice@example.com',
      password: 'securepass123',
      username: 'alice',
      displayName: 'Alice',
    };
    const meta = { deviceName: 'iPhone', userAgent: 'test', ipAddress: '127.0.0.1' };

    it('creates a user and returns tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        bio: null,
        locale: 'en-US',
      });
      prisma.session.create.mockResolvedValue({});

      const result = await service.register(dto, meta);

      expect(result.user.username).toBe('alice');
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('throws ConflictException for duplicate email', async () => {
      prisma.user.findFirst.mockResolvedValue({ email: 'alice@example.com', username: 'other' });

      await expect(service.register(dto, meta)).rejects.toThrow('Email is already registered');
    });

    it('throws ConflictException for duplicate username', async () => {
      prisma.user.findFirst.mockResolvedValue({ email: 'other@example.com', username: 'alice' });

      await expect(service.register(dto, meta)).rejects.toThrow('Username is already taken');
    });
  });

  describe('login', () => {
    const dto = { email: 'alice@example.com', password: 'securepass123' };
    const meta = { deviceName: 'iPhone', userAgent: 'test', ipAddress: '127.0.0.1' };

    it('returns tokens for valid credentials', async () => {
      const { hash } = await import('bcryptjs');
      const passwordHash = await hash('securepass123', 4);

      prisma.authAccount.findUnique.mockResolvedValue({
        passwordHash,
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          displayName: 'Alice',
          deletedAt: null,
        },
      });
      prisma.session.create.mockResolvedValue({});

      const result = await service.login(dto, meta);
      expect(result.user.username).toBe('alice');
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('throws UnauthorizedException for invalid password', async () => {
      const { hash } = await import('bcryptjs');
      const passwordHash = await hash('differentpass', 4);

      prisma.authAccount.findUnique.mockResolvedValue({
        passwordHash,
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          displayName: 'Alice',
          deletedAt: null,
        },
      });

      await expect(service.login(dto, meta)).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException for nonexistent account', async () => {
      prisma.authAccount.findUnique.mockResolvedValue(null);

      await expect(service.login(dto, meta)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refresh', () => {
    it('rotates refresh token and returns new tokens', async () => {
      const { createHash } = await import('crypto');
      const refreshToken = 'valid-refresh-token';
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        refreshTokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          deletedAt: null,
        },
      });
      prisma.session.update.mockResolvedValue({});

      const result = await service.refresh(refreshToken);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('throws for revoked session', async () => {
      const { createHash } = await import('crypto');
      const refreshToken = 'revoked-token';
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        refreshTokenHash,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', deletedAt: null },
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('throws for expired session', async () => {
      const { createHash } = await import('crypto');
      const refreshToken = 'expired-token';
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        refreshTokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', deletedAt: null },
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('revokes the session', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('some-refresh-token');
      expect(result).toEqual({ ok: true });
      expect(prisma.session.updateMany).toHaveBeenCalled();
    });

    it('throws for empty refreshToken', async () => {
      await expect(service.logout('')).rejects.toThrow('refreshToken is required');
    });
  });

  describe('account settings', () => {
    const user = {
      id: 'user-1',
      email: 'alice@example.com',
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      bio: null,
      locale: 'en-US',
      emailVerifiedAt: null,
      pendingEmail: null,
      deletedAt: null,
    };

    it('updates profile fields and stores email changes as pending', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue(user);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...user,
        username: 'maria',
        displayName: 'Maria',
        pendingEmail: 'new@example.com',
      });

      const result = await service.updateMe('user-1', {
        username: 'Maria',
        email: 'New@Example.com',
        displayName: 'Maria',
      });

      expect(result.username).toBe('maria');
      expect(result.pendingEmail).toBe('new@example.com');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          username: 'maria',
          pendingEmail: 'new@example.com',
          displayName: 'Maria',
        },
      });
    });

    it('rejects duplicate username changes', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue(user);
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });

      await expect(service.updateMe('user-1', { username: 'taken' })).rejects.toThrow(
        'Username is already taken',
      );
    });

    it('issues a hashed email-change token and returns the dev token', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({ ...user, pendingEmail: 'new@example.com' });
      prisma.accountToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.accountToken.create.mockResolvedValue({});

      const result = await service.requestEmailVerification('user-1');

      expect(result).toMatchObject({
        ok: true,
        email: 'new@example.com',
        pendingEmail: 'new@example.com',
      });
      expect('devToken' in result).toBe(true);
      const created = prisma.accountToken.create.mock.calls[0][0].data;
      expect(created.type).toBe(AccountTokenType.email_change);
      expect(created.email).toBe('new@example.com');
      expect(created.tokenHash).not.toBe((result as { devToken?: string }).devToken);
    });

    it('promotes pending email after email-change token verification', async () => {
      const expiresAt = new Date(Date.now() + 60_000);
      prisma.accountToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: AccountTokenType.email_change,
        email: 'new@example.com',
        consumedAt: null,
        expiresAt,
        user: { ...user, pendingEmail: 'new@example.com' },
      });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...user,
        email: 'new@example.com',
        pendingEmail: null,
        emailVerifiedAt: new Date('2026-05-19T12:00:00.000Z'),
      });
      prisma.authAccount.updateMany.mockResolvedValue({ count: 1 });
      prisma.accountToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyEmailToken('raw-token');

      expect(result.user.email).toBe('new@example.com');
      expect(result.user.pendingEmail).toBeNull();
      expect(prisma.authAccount.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', provider: 'email' },
        data: { providerUserId: 'new@example.com' },
      });
    });

    it('does not reveal whether an unknown password reset email exists', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.requestPasswordReset('nobody@example.com')).resolves.toEqual({
        ok: true,
      });
      expect(prisma.accountToken.create).not.toHaveBeenCalled();
    });

    it('resets password and revokes active sessions', async () => {
      prisma.accountToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        type: AccountTokenType.password_reset,
        email: 'alice@example.com',
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user,
      });
      prisma.authAccount.updateMany.mockResolvedValue({ count: 1 });
      prisma.session.updateMany.mockResolvedValue({ count: 2 });
      prisma.accountToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword({ token: 'raw-token', password: 'newpass123' });

      expect(result).toEqual({ ok: true });
      expect(prisma.authAccount.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', provider: 'email' },
        data: { passwordHash: expect.any(String) },
      });
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('hard-deletes an authenticated account', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue(user);
      prisma.review.findMany.mockResolvedValue([{ id: 'review-1' }]);
      prisma.comment.findMany.mockResolvedValue([{ id: 'comment-1' }]);
      prisma.translationCache.deleteMany.mockResolvedValue({ count: 2 });
      prisma.report.deleteMany.mockResolvedValue({ count: 1 });
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });
      prisma.user.delete.mockResolvedValue(user);

      const result = await service.deleteMe('user-1');

      expect(result).toEqual({ ok: true });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });

  describe('managed auth mode', () => {
    const managedConfig = {
      get: vi.fn((key: string) => (key === 'AUTH_PROVIDER' ? 'supabase' : 'test-secret')),
    };

    beforeEach(() => {
      service = new AuthService(prisma as never, jwt as never, managedConfig as never);
    });

    it('disables legacy registration when Supabase Auth is active', async () => {
      await expect(
        service.register(
          {
            email: 'alice@example.com',
            password: 'securepass123',
            username: 'alice',
            displayName: 'Alice',
          },
          {},
        ),
      ).rejects.toThrow('Managed auth is enabled');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a CritiCool profile from Supabase identity claims', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        bio: null,
        locale: 'en-US',
        emailVerifiedAt: new Date('2026-05-20T12:00:00.000Z'),
        pendingEmail: null,
      });

      const result = await service.bootstrapMe(
        {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'Alice@Example.com',
          username: '',
          profileReady: false,
        },
        { username: 'Alice', displayName: 'Alice' },
      );

      expect(result.username).toBe('alice');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'alice@example.com',
          username: 'alice',
          displayName: 'Alice',
          emailVerifiedAt: expect.any(Date),
          accounts: {
            create: {
              provider: 'supabase',
              providerUserId: '00000000-0000-0000-0000-000000000001',
            },
          },
        },
      });
    });

    it('rejects username conflicts during Supabase profile bootstrap', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000002',
        email: 'other@example.com',
        username: 'alice',
      });

      await expect(
        service.bootstrapMe(
          {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'alice@example.com',
            username: '',
          },
          { username: 'alice', displayName: 'Alice' },
        ),
      ).rejects.toThrow('Username is already taken');
    });

    it('keeps email changes out of the API profile update path', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        bio: null,
        locale: 'en-US',
        emailVerifiedAt: null,
        pendingEmail: null,
        deletedAt: null,
      });

      await expect(
        service.updateMe('user-1', { email: 'new@example.com' }),
      ).rejects.toThrow('Email changes are managed by Supabase Auth');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
