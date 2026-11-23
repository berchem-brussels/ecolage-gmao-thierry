/**
 * Point d'accès à l'API (version 0.8.0, point 1) : le dépôt d'un fichier part en formulaire multipart au champ
 * « fichier », avec le jeton anti-CSRF et sans en-tête Content-Type posé à la main (le navigateur pose la frontière).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setCsrfToken } from '../api';

const reponse = (status: number, json: unknown) => ({ ok: status < 400, status, statusText: '', json: async () => json });

afterEach(() => { vi.unstubAllGlobals(); setCsrfToken(null); });

describe('api.upload', () => {
  it('envoie un FormData au champ « fichier », avec le jeton anti-CSRF', async () => {
    const fetchMock = vi.fn(async () => reponse(200, { data: { id: 3, has_photo: 1 }, meta: { envelope: 1 } }));
    vi.stubGlobal('fetch', fetchMock);
    setCsrfToken('jeton-1');
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const r = await api.upload<{ has_photo: number }>('/lieux/3/photo', blob);
    expect(r.has_photo).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/lieux/3/photo');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe('jeton-1');
    expect(headers['Content-Type']).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    const f = (init.body as FormData).get('fichier') as File;
    expect(f.type).toBe('image/jpeg');
    expect(f.name).toBe('fichier');
  });

  it('rend une ApiError codée sur un refus du serveur (413)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse(413, { error: true, code: 'PAYLOAD_TOO_LARGE', message: 'Contenu trop volumineux.' })));
    const e = (await api.upload('/lieux/3/photo', new Blob(['x'], { type: 'image/png' })).catch((x: unknown) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(413);
    expect(e.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
