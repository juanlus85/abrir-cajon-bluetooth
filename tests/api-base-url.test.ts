import { afterEach, describe, expect, it, vi } from 'vitest';

type OAuthModule = typeof import('../constants/oauth');

async function loadOAuthModule(options?: {
  os?: 'web' | 'android';
  apiBaseUrl?: string;
  windowLocation?: { protocol: string; hostname: string } | null;
}): Promise<OAuthModule> {
  vi.resetModules();

  if (options?.apiBaseUrl !== undefined) {
    process.env.EXPO_PUBLIC_API_BASE_URL = options.apiBaseUrl;
  } else {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  vi.doMock('react-native', () => ({
    Platform: {
      OS: options?.os ?? 'web',
    },
  }));

  vi.doMock('expo-linking', () => ({
    createURL: vi.fn(() => 'manus://oauth/callback'),
    canOpenURL: vi.fn(async () => true),
    openURL: vi.fn(async () => undefined),
  }));

  if (options?.windowLocation === null) {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    (globalThis as Record<string, unknown>).window = {
      location: options?.windowLocation ?? {
        protocol: 'https:',
        hostname: '8081-demo.us2.manus.computer',
      },
    };
  }

  return import('../constants/oauth');
}

afterEach(() => {
  vi.resetModules();
  vi.unmock('react-native');
  vi.unmock('expo-linking');
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  delete (globalThis as Record<string, unknown>).window;
});

describe('getApiBaseUrl', () => {
  it('prioriza la variable de entorno cuando está definida', async () => {
    const { getApiBaseUrl } = await loadOAuthModule({
      os: 'web',
      apiBaseUrl: 'https://api.midominio.test/',
    });

    expect(getApiBaseUrl()).toBe('https://api.midominio.test');
  });

  it('deriva la URL de la API desde la vista web cambiando 8081 por 3000', async () => {
    const { getApiBaseUrl } = await loadOAuthModule({
      os: 'web',
      windowLocation: {
        protocol: 'https:',
        hostname: '8081-i6oe6v0r3avi4v3zubilu-fffcd707.us2.manus.computer',
      },
    });

    expect(getApiBaseUrl()).toBe(
      'https://3000-i6oe6v0r3avi4v3zubilu-fffcd707.us2.manus.computer',
    );
  });

  it('devuelve una cadena vacía cuando no puede derivar la URL del servidor', async () => {
    const { getApiBaseUrl } = await loadOAuthModule({
      os: 'android',
      windowLocation: null,
    });

    expect(getApiBaseUrl()).toBe('');
  });
});
