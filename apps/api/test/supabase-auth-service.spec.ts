import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthService } from '../src/auth/supabase-auth.service';

function createConfig(values: Record<string, string | undefined>) {
  return {
    get: vi.fn((key: string) => values[key]),
  };
}

describe('SupabaseAuthService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not call Supabase admin APIs when managed auth is disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const service = new SupabaseAuthService(
      createConfig({
        AUTH_PROVIDER: 'legacy',
        SUPABASE_URL: 'https://criticool.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }) as never,
    );

    await expect(service.deleteAuthUser('user-1')).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the service-role key before deleting a managed auth user', async () => {
    const service = new SupabaseAuthService(
      createConfig({
        AUTH_PROVIDER: 'supabase',
        SUPABASE_URL: 'https://criticool.supabase.co',
      }) as never,
    );

    await expect(service.deleteAuthUser('user-1')).rejects.toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is required',
    );
  });

  it('deletes a managed auth user through Supabase admin credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const service = new SupabaseAuthService(
      createConfig({
        AUTH_PROVIDER: 'supabase',
        SUPABASE_URL: 'https://criticool.supabase.co/',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }) as never,
    );

    await expect(service.deleteAuthUser('user-1')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://criticool.supabase.co/auth/v1/admin/users/user-1',
      {
        method: 'DELETE',
        headers: {
          apikey: 'service-role-key',
          Authorization: 'Bearer service-role-key',
        },
      },
    );
  });

  it('treats already-deleted Supabase users as successful cleanup', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    const service = new SupabaseAuthService(
      createConfig({
        AUTH_PROVIDER: 'supabase',
        SUPABASE_URL: 'https://criticool.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }) as never,
    );

    await expect(service.deleteAuthUser('missing-user')).resolves.toBeUndefined();
  });
});
