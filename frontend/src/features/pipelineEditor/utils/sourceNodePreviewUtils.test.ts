import { describe, expect, it } from 'vitest';
import { getFileExtension, getSourceLabel } from './sourceNodePreviewUtils';

describe('sourceNodePreviewUtils', () => {
  it('normalizes file extensions', () => {
    expect(getFileExtension('report.CSV')).toBe('csv');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('no-extension')).toBe('');
  });

  it('builds a readable source label', () => {
    expect(getSourceLabel('Sales file')).toBe('Файл Sales file');
  });
});