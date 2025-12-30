/**
 * Content replacer - intelligently replaces feature names in file content
 */

import { getAllCaseVariations, extractWords, CaseType } from '../utils/naming';

export interface ReplacementMap {
  from: Map<CaseType, string>;
  to: Map<CaseType, string>;
}

export class ContentReplacer {
  /**
   * Replace all occurrences of old feature name with new feature name in content
   */
  replaceContent(content: string, oldFeatureName: string, newFeatureName: string): string {
    // Get all case variations
    const oldVariations = getAllCaseVariations(oldFeatureName);
    const newVariations = getAllCaseVariations(newFeatureName);
    
    let result = content;
    
    // Replace in order: longest to shortest to avoid partial replacements
    const replacements = [
      { old: oldVariations.get(CaseType.PascalCase)!, new: newVariations.get(CaseType.PascalCase)! },
      { old: oldVariations.get(CaseType.camelCase)!, new: newVariations.get(CaseType.camelCase)! },
      { old: oldVariations.get(CaseType.snake_case)!, new: newVariations.get(CaseType.snake_case)! },
      { old: oldVariations.get(CaseType.kebabCase)!, new: newVariations.get(CaseType.kebabCase)! },
      { old: oldVariations.get(CaseType.UPPER_CASE)!, new: newVariations.get(CaseType.UPPER_CASE)! },
    ];
    
    // Sort by length (longest first) to avoid partial matches
    replacements.sort((a, b) => b.old.length - a.old.length);
    
    // Replace each variation
    for (const { old, new: newVal } of replacements) {
      if (old && newVal && old !== newVal) {
        // Use global regex with word boundaries for more accurate replacement
        const regex = new RegExp(this.escapeRegex(old), 'g');
        result = result.replace(regex, newVal);
      }
    }
    
    // Also try to replace individual words for partial matches
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
    // Get all case variations
    const oldVariations = getAllCaseVariations(oldFeatureName);
    const newVariations = getAllCaseVariations(newFeatureName);
    
    let result = filePath;
    
    // Replace each variation in the path
    for (const [caseType, oldVal] of oldVariations) {
      const newVal = newVariations.get(caseType);
      if (oldVal && newVal) {
        result = result.replace(new RegExp(this.escapeRegex(oldVal), 'g'), newVal);
      }
    }
    
    return result;
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

