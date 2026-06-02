import type { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { extractError } from './extractError';

describe('extractError', () => {
  it('returns the message from a normal error', () => {
    expect(extractError(new Error('Boom'))).toBe('Boom');
  });

  it('extracts text from axios string responses', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: 'Invalid request',
      },
    } as AxiosError;

    expect(extractError(error)).toBe('Invalid request');
  });

  it('prefers detail field and array errors when available', () => {
    const detailError = {
      isAxiosError: true,
      response: {
        data: {
          detail: 'Not allowed',
        },
      },
    } as AxiosError;

    const arrayError = {
      isAxiosError: true,
      response: {
        data: {
          email: ['Already taken'],
        },
      },
    } as AxiosError;

    expect(extractError(detailError)).toBe('Not allowed');
    expect(extractError(arrayError)).toBe('Already taken');
  });

  it('falls back when the error has no useful details', () => {
    expect(extractError(undefined, 'Fallback')).toBe('Fallback');
  });
});
