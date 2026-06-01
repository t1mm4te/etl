import { describe, expect, it } from 'vitest';
import { buildNextNodeConfig } from './nodePreviewUtils';

describe('buildNextNodeConfig', () => {
  it('returns the original config when there is no datasource id', () => {
    const config = { filter: 'active' };

    expect(buildNextNodeConfig(config, '')).toBe(config);
  });

  it('adds datasource and sheet metadata when available', () => {
    expect(
      buildNextNodeConfig(
        { filter: 'active' },
        'datasource-1',
        {
          selectedSheetName: 'Sheet1',
          excelSheetNames: ['Sheet1', 'Sheet2'],
        }
      )
    ).toEqual({
      filter: 'active',
      datasource_id: 'datasource-1',
      selected_sheet_name: 'Sheet1',
      excel_sheet_names: ['Sheet1', 'Sheet2'],
    });
  });
});