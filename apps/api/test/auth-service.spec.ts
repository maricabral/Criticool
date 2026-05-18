import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

function createMockPrisma() {
  return {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findFirstOrThrow: vi.fn(),
    },
    authAccount: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
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
});
