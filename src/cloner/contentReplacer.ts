/**
 * Content replacer - intelligently replaces feature names in file content
 */

import { getAllCaseVariations, extractWords, CaseType, detectCaseType } from '../utils/naming';

export interface ReplacementMap {
  from: Map<CaseType, string>;
  to: Map<CaseType, string>;
}

export class ContentReplacer {
  /**
   * Replace all occurrences of old feature name with new feature name in content
   */
  replaceContent(content: string, oldFeatureName: string, newFeatureName: string): string {
    let result = this.replaceVariations(content, oldFeatureName, newFeatureName);
    result = this.replacePartialMatches(result, oldFeatureName, newFeatureName);
    return result;
  }

  /**
   * Replace partial word matches (e.g., "barcode" within "ProductBarcode")
   */
  private replacePartialMatches(content: string, oldFeatureName: string, newFeatureName: string): string {
    const oldWords = extractWords(oldFeatureName);
    const newWords = extractWords(newFeatureName);
    
    // If we have multiple words, try to replace the last significant word
    if (oldWords.length > 1) {
      const lastOldWord = oldWords[oldWords.length - 1];
      const lastNewWord = newWords[newWords.length - 1];
      
      if (lastOldWord && lastNewWord && lastOldWord.length > 3) {
        // Replace the last word with case sensitivity
        const variations = [
          {
            old: lastOldWord.charAt(0).toUpperCase() + lastOldWord.slice(1),
            new: lastNewWord.charAt(0).toUpperCase() + lastNewWord.slice(1)
          },
          {
            old: lastOldWord.toLowerCase(),
            new: lastNewWord.toLowerCase()
          },
          {
            old: lastOldWord.toUpperCase(),
            new: lastNewWord.toUpperCase()
          }
        ];
        
        let result = content;
        for (const { old, new: newVal } of variations) {
          const regex = new RegExp(this.escapeRegex(old), 'g');
          result = result.replace(regex, newVal);
        }
        return result;
      }
    }
    
    return content;
  }

  /**
   * Replace feature name in file path
   */
  replaceInPath(filePath: string, oldFeatureName: string, newFeatureName: string): string {
    return this.replaceVariations(filePath, oldFeatureName, newFeatureName);
  }

  /**
   * Replace old feature name variations with new ones, using context to resolve ambiguities.
   * When a single-word source name (e.g. "brand") produces the same string for multiple case types
   * (camelCase, snake_case, kebab-case all yield "brand"), this method inspects surrounding
   * characters to decide whether to replace with "bugReport", "bug_report", or "bug-report".
   */
  private replaceVariations(text: string, oldFeatureName: string, newFeatureName: string): string {
    // First pass: replace exact feature name variations (longest match first)
    let result = this.applyVariationReplacements(text, oldFeatureName, newFeatureName);

    // Second pass: replace singular/stem forms if the feature name is plural
    // e.g. source "contributions" → also replace "contribution" with target stem
    const oldStem = this.deriveStem(oldFeatureName);
    if (oldStem) {
      const newStem = this.deriveStem(newFeatureName) || newFeatureName;
      result = this.applyVariationReplacements(result, oldStem, newStem);
    }

    return result;
  }

  /**
   * Core replacement logic: generate all case variations of oldName, replace with newName variations.
   * Handles ambiguous single-word names using surrounding context detection.
   */
  private applyVariationReplacements(text: string, oldName: string, newName: string): string {
    const oldVariations = getAllCaseVariations(oldName);
    const newVariations = getAllCaseVariations(newName);
    const defaultCaseType = this.getDefaultCaseType(newName);

    let result = text;

    // Group old values to detect ambiguities (different case types producing the same string)
    const oldValueToTypes = new Map<string, CaseType[]>();
    for (const [caseType, oldVal] of oldVariations) {
      if (!oldVal) { continue; }
      const types = oldValueToTypes.get(oldVal) || [];
      types.push(caseType);
      oldValueToTypes.set(oldVal, types);
    }

    // Sort unique old values by length (longest first) to avoid partial replacements
    const sortedEntries = Array.from(oldValueToTypes.entries())
      .sort((a, b) => b[0].length - a[0].length);

    for (const [oldVal, caseTypes] of sortedEntries) {
      // Check if all case types map to the same new value (no ambiguity)
      const uniqueNewVals = new Set(caseTypes.map(ct => newVariations.get(ct)!));

      if (uniqueNewVals.size <= 1) {
        const newVal = newVariations.get(caseTypes[0])!;
        if (oldVal && newVal && oldVal !== newVal) {
          result = result.replace(new RegExp(this.escapeRegex(oldVal), 'g'), newVal);
        }
      } else {
        // Ambiguous: same old value maps to different new values.
        // Use surrounding context to pick the right replacement.
        const regex = new RegExp(this.escapeRegex(oldVal), 'g');
        const textToSearch = result;
        result = result.replace(regex, (match, offset) => {
          const detectedType = this.detectCaseFromContext(
            textToSearch, offset, match.length, caseTypes, defaultCaseType
          );
          return newVariations.get(detectedType) || match;
        });
      }
    }

    return result;
  }

  /**
   * Derive the singular/stem form of a feature name by removing common plural suffixes.
   * Returns null if no stem change is detected.
   */
  private deriveStem(name: string): string | null {
    const lower = name.toLowerCase();

    // Skip names ending in 'ss' (class, process), 'us' (status), 'is' (analysis)
    if (lower.endsWith('ss') || lower.endsWith('us') || lower.endsWith('is')) {
      return null;
    }

    // -ies → -y (categories → category, user_stories → user_story)
    if (lower.endsWith('ies') && lower.length > 3) {
      return name.slice(0, -3) + 'y';
    }

    // -ses, -xes, -zes, -ches, -shes → remove -es (addresses → address)
    if (lower.length > 3 && (lower.endsWith('ses') || lower.endsWith('xes') ||
        lower.endsWith('zes') || lower.endsWith('ches') || lower.endsWith('shes'))) {
      return name.slice(0, -2);
    }

    // -s → remove -s (contributions → contribution)
    if (lower.endsWith('s') && lower.length > 1) {
      return name.slice(0, -1);
    }

    return null;
  }

  /**
   * Detect which case type is being used at a specific match position based on surrounding characters.
   */
  private detectCaseFromContext(
    text: string,
    offset: number,
    matchLength: number,
    possibleTypes: CaseType[],
    defaultType: CaseType
  ): CaseType {
    const charAfter = offset + matchLength < text.length ? text[offset + matchLength] : '';
    const charBefore = offset > 0 ? text[offset - 1] : '';

    // Character after the match is the strongest signal
    if (charAfter === '_' && possibleTypes.includes(CaseType.snake_case)) {
      return CaseType.snake_case;
    }
    if (charAfter === '-' && possibleTypes.includes(CaseType.kebabCase)) {
      return CaseType.kebabCase;
    }
    if (/[A-Z]/.test(charAfter) && possibleTypes.includes(CaseType.camelCase)) {
      return CaseType.camelCase;
    }

    // Character before the match
    if (charBefore === '_' && possibleTypes.includes(CaseType.snake_case)) {
      // Distinguish true snake_case (e.g. "some_brand") from a Dart private prefix (e.g. "_brandDetails")
      if (offset > 1 && /[a-z0-9]/.test(text[offset - 2])) {
        return CaseType.snake_case;
      }
    }
    if (charBefore === '-' && possibleTypes.includes(CaseType.kebabCase)) {
      return CaseType.kebabCase;
    }

    // No clear signal — fall back to the case type of the user-entered name
    return possibleTypes.includes(defaultType) ? defaultType : possibleTypes[0];
  }

  /**
   * Get the default case type from the feature name as entered by the user.
   */
  private getDefaultCaseType(featureName: string): CaseType {
    const detected = detectCaseType(featureName);
    return detected !== CaseType.Unknown ? detected : CaseType.snake_case;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Preview replacements that would be made
   */
  previewReplacements(content: string, oldFeatureName: string, newFeatureName: string): Array<{ line: number; old: string; new: string }> {
    const replacements: Array<{ line: number; old: string; new: string }> = [];
    const lines = content.split('\n');
    
    const oldVariations = getAllCaseVariations(oldFeatureName);
    
    lines.forEach((line, index) => {
      for (const [_, oldVal] of oldVariations) {
        if (line.includes(oldVal)) {
          const newLine = this.replaceContent(line, oldFeatureName, newFeatureName);
          if (newLine !== line) {
            replacements.push({
              line: index + 1,
              old: line.trim(),
              new: newLine.trim()
            });
            break; // Only add one replacement per line
          }
        }
      }
    });
    
    return replacements.slice(0, 10); // Limit preview to 10 lines
  }

  /**
   * Check if content contains feature name
   */
  containsFeatureName(content: string, featureName: string): boolean {
    const variations = getAllCaseVariations(featureName);
    
    for (const [_, value] of variations) {
      if (content.includes(value)) {
        return true;
      }
    }
    
    return false;
  }
}

