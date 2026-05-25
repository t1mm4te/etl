export function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

export function resolveSourceFileName(
  originalFileName: string | undefined,
  fallbackFileName: string | undefined,
  sheetName?: string
) {
  const primary = originalFileName?.trim();
  const fallback = fallbackFileName?.trim();
  const normalizedSheet = sheetName?.trim().toLowerCase();

  if (primary && normalizedSheet && primary.toLowerCase() === normalizedSheet && fallback) {
    return fallback;
  }

  return primary || fallback || sheetName || 'файл';
}

export function getSourceLabel(fileName: string, sheetName?: string, excelSheetNames?: string[]) {
  const base = `Файл ${fileName}`;
  if (
    sheetName &&
    Array.isArray(excelSheetNames) &&
    excelSheetNames.length > 1 &&
    fileName.toLowerCase() !== sheetName.toLowerCase()
  ) {
    return `${base} ${sheetName}`;
  }
  return base;
}
