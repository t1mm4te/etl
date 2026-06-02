import { describe, expect, it } from 'vitest';
import { getNodeKind } from './getNodeKind';

describe('getNodeKind', () => {
  it('maps source nodes to source kind', () => {
    expect(getNodeKind('source_file')).toBe('source');
    expect(getNodeKind('source_db')).toBe('source');
  });

  it('maps export nodes to sink kind', () => {
    expect(getNodeKind('export_file')).toBe('sink');
  });

  it('defaults to transform kind', () => {
    expect(getNodeKind('filter_rows')).toBe('transform');
  });
});
