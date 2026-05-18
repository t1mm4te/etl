import axios from 'axios';

export function extractError(error: unknown, fallback = 'Что-то пошло не так'): string {
  if (axios.isAxiosError(error)) {
    const responseError = error.response?.data as
      | string
      | { detail?: string; [key: string]: unknown }
      | undefined;

    if (typeof responseError === 'string') {
      return responseError;
    }

    if (responseError?.detail && typeof responseError.detail === 'string') {
      return responseError.detail;
    }

    const firstEntry = Object.values(responseError ?? {}).find((value) => {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        return true;
      }

      return typeof value === 'string';
    });

    if (Array.isArray(firstEntry) && firstEntry.length > 0) {
      return String(firstEntry[0]);
    }

    if (typeof firstEntry === 'string') {
      return firstEntry;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
