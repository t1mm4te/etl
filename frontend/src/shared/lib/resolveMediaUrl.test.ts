import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMediaUrl } from './resolveMediaUrl';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveMediaUrl', () => {
  it('returns null when url is missing', () => {
    expect(resolveMediaUrl()).toBeNull();
    expect(resolveMediaUrl(null)).toBeNull();
  });

  it('keeps relative urls unchanged', () => {
    expect(resolveMediaUrl('/media/avatar.png')).toBe('/media/avatar.png');
  });

  it('maps dev media urls to the pathname', () => {
    vi.stubEnv('DEV', true);

    expect(resolveMediaUrl('http://localhost:8000/media/avatar.png')).toBe('/media/avatar.png');
  });

  it('keeps non-media absolute urls intact', () => {
    vi.stubEnv('DEV', false);

    expect(resolveMediaUrl('https://example.com/avatar.png')).toBe(
      'https://example.com/avatar.png'
    );
  });
});
