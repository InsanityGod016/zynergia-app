import { describe, expect, it } from 'vitest';
import {
  createQrDraft,
  generateQrDataUrl,
  loadQrDraft,
  resolveQrPlacement,
  saveQrDraft,
  validateHttpUrl,
} from '@/lib/qr-tools';

describe('qrTools', () => {
  it('accepts only complete HTTP and HTTPS links', () => {
    expect(validateHttpUrl('https://zynergia.pro/app')).toMatchObject({ ok: true });
    expect(validateHttpUrl('http://example.com')).toMatchObject({ ok: true });
    expect(validateHttpUrl('javascript:alert(1)')).toEqual({
      ok: false,
      error: 'El enlace debe comenzar con http:// o https://.',
    });
    expect(validateHttpUrl('zynergia.pro')).toMatchObject({ ok: false });
  });

  it('generates a PNG data URL locally', async () => {
    const result = await generateQrDataUrl('https://zynergia.pro/app');
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('keeps each user draft isolated and repairs invalid stored values', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };

    expect(saveQrDraft('user-a', { url: 'https://a.test', placement: { preset: 'center', size: 0.34 } }, storage)).toBe(true);
    expect(loadQrDraft('user-a', storage)).toMatchObject({ url: 'https://a.test', placement: { preset: 'center', size: 0.34 } });
    expect(loadQrDraft('user-b', storage)).toEqual(createQrDraft());
  });

  it('keeps every preset inside the image', () => {
    for (const preset of ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right', 'manual']) {
      const result = resolveQrPlacement({ preset, size: 0.34, x: 2, y: -1 }, 320, 180);
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x + result.size).toBeLessThanOrEqual(320);
      expect(result.y + result.size).toBeLessThanOrEqual(180);
    }
  });
});
