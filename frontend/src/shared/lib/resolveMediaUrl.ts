export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    if (import.meta.env.DEV) {
      try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/media/')) {
          return parsed.pathname;
        }
      } catch {
        // ignore
      }
    }

    return url;
  }

  return url;
}
