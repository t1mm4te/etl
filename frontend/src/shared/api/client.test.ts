import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { apiClient } from './client';

type RequestConfig = {
  headers?: Record<string, string>;
};

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('adds token header when auth token exists', () => {
    localStorage.setItem('auth_token', 'abc-123');

    const requestHandler = (
      apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled?: (config: RequestConfig) => RequestConfig }>;
      }
    ).handlers[0]?.fulfilled;

    expect(requestHandler).toBeTypeOf('function');
    expect(requestHandler?.({ headers: {} })).toEqual({
      headers: { Authorization: 'Token abc-123' },
    });
  });

  it('leaves headers unchanged when token is absent', () => {
    const requestHandler = (
      apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled?: (config: RequestConfig) => RequestConfig }>;
      }
    ).handlers[0]?.fulfilled;

    expect(requestHandler?.({ headers: {} })).toEqual({ headers: {} });
  });
});
