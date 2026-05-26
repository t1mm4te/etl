export function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot >= 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
}

export function getSourceLabel(datasourceName: string) {
  return `Файл ${datasourceName}`;
}
