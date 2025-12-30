/**
 * Utility functions for name conversion and transformation
 */

export enum CaseType {
  PascalCase = 'PascalCase',
  camelCase = 'camelCase',
  snake_case = 'snake_case',
  kebabCase = 'kebab-case',
  UPPER_CASE = 'UPPER_CASE',
  Unknown = 'Unknown'
}

/**
 * Detect the case type of a string
 */
export function detectCaseType(str: string): CaseType {
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) {
    return CaseType.PascalCase;
  }
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) {
    return CaseType.camelCase;
  }
  if (/^[a-z][a-z0-9_]*$/.test(str)) {
    return CaseType.snake_case;
  }
  if (/^[a-z][a-z0-9-]*$/.test(str)) {
    return CaseType.kebabCase;
  }
  if (/^[A-Z][A-Z0-9_]*$/.test(str)) {
    return CaseType.UPPER_CASE;
  }
  return CaseType.Unknown;
}

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Convert a string to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .replace(/^_/, '')
    .toLowerCase();
}

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]+/g, '-')
    .replace(/^-/, '')
    .toLowerCase();
}

/**
 * Convert a string to UPPER_CASE
 */
export function toUpperCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Convert a string to a specific case type
 */
export function convertCase(str: string, caseType: CaseType): string {
  switch (caseType) {
    case CaseType.PascalCase:
      return toPascalCase(str);
    case CaseType.camelCase:
      return toCamelCase(str);
    case CaseType.snake_case:
      return toSnakeCase(str);
    case CaseType.kebabCase:
      return toKebabCase(str);
    case CaseType.UPPER_CASE:
      return toUpperCase(str);
    default:
      return str;
  }
}

/**
 * Extract the base feature name from a folder path
 * e.g., "lib/features/product_barcode" -> "product_barcode"
 */
export function extractFeatureName(folderPath: string): string {
  const parts = folderPath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

/**
 * Get all case variations of a name
 */
export function getAllCaseVariations(name: string): Map<CaseType, string> {
  const variations = new Map<CaseType, string>();
  variations.set(CaseType.PascalCase, toPascalCase(name));
  variations.set(CaseType.camelCase, toCamelCase(name));
  variations.set(CaseType.snake_case, toSnakeCase(name));
  variations.set(CaseType.kebabCase, toKebabCase(name));
  variations.set(CaseType.UPPER_CASE, toUpperCase(name));
  return variations;
}

/**
 * Extract word segments from a name (e.g., "product_barcode" -> ["product", "barcode"])
 */
export function extractWords(name: string): string[] {
  // Handle different case types
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);
}

