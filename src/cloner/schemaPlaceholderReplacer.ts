/**
 * Replaces domain-specific Node.js schema fields with editable placeholders.
 */

import * as path from 'path';

interface PropertyBlock {
  name: string;
  text: string;
}

interface Replacement {
  start: number;
  end: number;
  replacement: string;
}

export class SchemaPlaceholderReplacer {
  private readonly timestampFieldNames = new Set([
    'createdAt',
    'updatedAt',
    'deletedAt',
    'created_at',
    'updated_at',
    'deleted_at'
  ]);

  replaceIfApplicable(content: string, filePath: string): string {
    if (!this.isNodeSchemaCandidate(content, filePath)) {
      return content;
    }

    let result = this.replaceMongooseSchemaFields(content);
    result = this.replaceSequelizeSchemaFields(result);
    result = this.removeMongooseSchemaExtensions(result);
    result = this.addMongooseSchemaGuideSections(result);
    result = this.removeUnusedSchemaHelpers(result);
    return result;
  }

  private isNodeSchemaCandidate(content: string, filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.ts', '.cjs', '.mjs', '.cts', '.mts'].includes(ext)) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    const looksLikeModelFile = /\/(models?|schemas?|entities?)\//.test(normalizedPath) ||
      /(model|schema|entity)\.(js|ts|cjs|mjs|cts|mts)$/.test(path.basename(filePath).toLowerCase());

    if (!looksLikeModelFile) {
      return false;
    }

    return /new\s+(?:mongoose\.)?Schema\s*\(/.test(content) ||
      /mongoose\.Schema\s*\(/.test(content) ||
      /sequelize\.define\s*\(/.test(content) ||
      /\.init\s*\(/.test(content) ||
      /\bDataTypes\.[A-Za-z]+/.test(content);
  }

  private replaceMongooseSchemaFields(content: string): string {
    const replacements: Replacement[] = [];
    const schemaCall = /\b(?:new\s+(?:mongoose\.)?Schema|mongoose\.Schema)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = schemaCall.exec(content)) !== null) {
      const objectStart = this.findNextNonWhitespace(content, schemaCall.lastIndex);
      if (content[objectStart] !== '{') {
        continue;
      }

      const objectEnd = this.findMatchingBracket(content, objectStart, '{', '}');
      if (objectEnd === -1) {
        continue;
      }

      const replacement = this.buildPlaceholderObject(content, objectStart, objectEnd);
      if (replacement) {
        replacements.push({ start: objectStart, end: objectEnd + 1, replacement });
      }
    }

    return this.applyReplacements(content, replacements);
  }

  private replaceSequelizeSchemaFields(content: string): string {
    const replacements: Replacement[] = [];
    this.collectSequelizeDefineReplacements(content, replacements);
    this.collectSequelizeInitReplacements(content, replacements);
    return this.applyReplacements(content, replacements);
  }

  private removeMongooseSchemaExtensions(content: string): string {
    const schemaNames = this.getMongooseSchemaVariableNames(content);
    if (schemaNames.length === 0) {
      return content;
    }

    const replacements: Replacement[] = [];
    for (const schemaName of schemaNames) {
      const extensionNeedles = [
        `${schemaName}.index(`,
        `${schemaName}.virtual(`,
        `${schemaName}.pre(`,
        `${schemaName}.post(`,
        `${schemaName}.methods.`,
        `${schemaName}.statics.`
      ];

      extensionNeedles.forEach(needle => {
        this.collectStatementReplacements(content, needle, replacements);
      });
    }

    return this.applyReplacements(content, replacements);
  }

  private addMongooseSchemaGuideSections(content: string): string {
    const schemaNames = this.getMongooseSchemaVariableNames(content);
    if (schemaNames.length === 0) {
      return content;
    }

    let result = content;
    for (const schemaName of schemaNames) {
      const declarationPattern = new RegExp(`\\b(?:const|let|var)\\s+${schemaName}\\s*=\\s*(?:new\\s+)?(?:mongoose\\.)?Schema\\s*\\(`);
      const declarationMatch = declarationPattern.exec(result);
      if (!declarationMatch) {
        continue;
      }

      const declarationEnd = this.findStatementEnd(result, declarationMatch.index);
      if (declarationEnd === -1) {
        continue;
      }

      const lineIndent = this.getLineIndent(result, declarationMatch.index);
      const guideBlock =
        `\n\n${lineIndent}// Indexing for better query performance` +
        `\n${lineIndent}// Add indexes for fields you filter/sort by often (e.g. slug, status, createdAt).` +
        `\n${lineIndent}// Example: ${schemaName}.index({ createdAt: -1 });` +
        `\n\n${lineIndent}// Virtuals for formatted response` +
        `\n${lineIndent}// Use virtuals for computed values that should not be stored in DB.` +
        `\n${lineIndent}// Example: ${schemaName}.virtual('summary').get(function () { return ''; });` +
        `\n\n${lineIndent}// Hooks for pre and post actions` +
        `\n${lineIndent}// Add pre/post hooks for side effects (validation, normalization, audit logs).` +
        `\n${lineIndent}// Example: ${schemaName}.pre('save', async function (next) { next(); });`;

      result = result.slice(0, declarationEnd + 1) + guideBlock + result.slice(declarationEnd + 1);
    }

    return result;
  }

  private removeUnusedSchemaHelpers(content: string): string {
    return content
      .replace(/^\s*(?:const|let|var)\s*\{\s*uploadImage\s*\}\s*=\s*require\([^)]*\);\s*\n/gm, '')
      .replace(/^\s*import\s*\{\s*uploadImage\s*\}\s*from\s*['"][^'"]+['"];\s*\n/gm, '')
      .replace(/^\s*\/\/.*upload image.*\n/gim, '')
      .replace(/^\s*\/\/\s*index(?:ing)?\s+for\s+better\s+query\s+performance.*\n/gim, '')
      .replace(/^\s*\/\/\s*virtual(?:s)?\s+to\s+get\s+formatted\s+duration.*\n/gim, '');
  }

  private collectStatementReplacements(content: string, needle: string, replacements: Replacement[]): void {
    let searchIndex = 0;
    while (true) {
      const statementStart = content.indexOf(needle, searchIndex);
      if (statementStart === -1) {
        break;
      }

      const statementEnd = this.findStatementEnd(content, statementStart);
      if (statementEnd === -1) {
        searchIndex = statementStart + needle.length;
        continue;
      }

      replacements.push({
        start: statementStart,
        end: statementEnd + 1,
        replacement: ''
      });
      searchIndex = statementEnd + 1;
    }
  }

  private getMongooseSchemaVariableNames(content: string): string[] {
    const names = new Set<string>();
    const schemaDeclarationPattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = schemaDeclarationPattern.exec(content)) !== null) {
      if (match[1]) {
        names.add(match[1]);
      }
    }
    return Array.from(names);
  }

  private findStatementEnd(content: string, start: number): number {
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    let quote: string | null = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = start; i < content.length; i++) {
      const char = content[i];
      const next = content[i + 1];

      if (lineComment) {
        if (char === '\n') {
          lineComment = false;
        }
        continue;
      }

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false;
          i++;
        }
        continue;
      }

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        lineComment = true;
        i++;
        continue;
      }

      if (char === '/' && next === '*') {
        blockComment = true;
        i++;
        continue;
      }

      if (char === '"' || char === '\'' || char === '`') {
        quote = char;
        continue;
      }

      if (char === '(') {
        parenDepth++;
        continue;
      }

      if (char === ')') {
        parenDepth = Math.max(parenDepth - 1, 0);
        continue;
      }

      if (char === '{') {
        braceDepth++;
        continue;
      }

      if (char === '}') {
        braceDepth = Math.max(braceDepth - 1, 0);
        continue;
      }

      if (char === '[') {
        bracketDepth++;
        continue;
      }

      if (char === ']') {
        bracketDepth = Math.max(bracketDepth - 1, 0);
        continue;
      }

      if (char === ';' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        return i;
      }
    }

    return -1;
  }

  private collectSequelizeDefineReplacements(content: string, replacements: Replacement[]): void {
    const defineCall = /\bsequelize\.define\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = defineCall.exec(content)) !== null) {
      const openParen = content.indexOf('(', match.index);
      const firstArgComma = this.findTopLevelComma(content, openParen + 1);
      if (firstArgComma === -1) {
        continue;
      }

      const objectStart = this.findNextNonWhitespace(content, firstArgComma + 1);
      if (content[objectStart] !== '{') {
        continue;
      }

      const objectEnd = this.findMatchingBracket(content, objectStart, '{', '}');
      if (objectEnd === -1) {
        continue;
      }

      const replacement = this.buildPlaceholderObject(content, objectStart, objectEnd);
      if (replacement) {
        replacements.push({ start: objectStart, end: objectEnd + 1, replacement });
      }
    }
  }

  private collectSequelizeInitReplacements(content: string, replacements: Replacement[]): void {
    const initCall = /\.init\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = initCall.exec(content)) !== null) {
      const openParen = content.indexOf('(', match.index);
      const objectStart = this.findNextNonWhitespace(content, openParen + 1);
      if (content[objectStart] !== '{') {
        continue;
      }

      const objectEnd = this.findMatchingBracket(content, objectStart, '{', '}');
      if (objectEnd === -1) {
        continue;
      }

      const replacement = this.buildPlaceholderObject(content, objectStart, objectEnd);
      if (replacement) {
        replacements.push({ start: objectStart, end: objectEnd + 1, replacement });
      }
    }
  }

  private buildPlaceholderObject(content: string, objectStart: number, objectEnd: number): string | null {
    const body = content.slice(objectStart + 1, objectEnd);
    const properties = this.splitTopLevelProperties(body);
    if (properties.length === 0) {
      return null;
    }

    const removableProperties = properties.filter(property => !this.shouldPreserveProperty(property.name));
    if (removableProperties.length === 0) {
      return null;
    }

    const indent = this.getLineIndent(content, objectStart);
    const propertyIndent = `${indent}  `;
    const preservedProperties = properties.filter(property => this.shouldPreserveProperty(property.name));
    const lines = [
      '{',
      `${propertyIndent}// TODO: Add properties for this model.`
    ];

    preservedProperties.forEach((property, index) => {
      const suffix = index < preservedProperties.length - 1 ? ',' : '';
      lines.push(`${this.indentProperty(property.text, propertyIndent)}${suffix}`);
    });

    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  private shouldPreserveProperty(name: string): boolean {
    return this.timestampFieldNames.has(name);
  }

  private splitTopLevelProperties(body: string): PropertyBlock[] {
    const properties: PropertyBlock[] = [];
    let depth = 0;
    let start = 0;
    let quote: string | null = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      const next = body[i + 1];

      if (lineComment) {
        if (char === '\n') {
          lineComment = false;
        }
        continue;
      }

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false;
          i++;
        }
        continue;
      }

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        lineComment = true;
        i++;
        continue;
      }

      if (char === '/' && next === '*') {
        blockComment = true;
        i++;
        continue;
      }

      if (char === '"' || char === '\'' || char === '`') {
        quote = char;
        continue;
      }

      if (char === '{' || char === '[' || char === '(') {
        depth++;
        continue;
      }

      if (char === '}' || char === ']' || char === ')') {
        depth = Math.max(depth - 1, 0);
        continue;
      }

      if (char === ',' && depth === 0) {
        this.pushPropertyBlock(body.slice(start, i), properties);
        start = i + 1;
      }
    }

    this.pushPropertyBlock(body.slice(start), properties);
    return properties;
  }

  private pushPropertyBlock(text: string, properties: PropertyBlock[]): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const match = trimmed.match(/^(?:['"]?([A-Za-z_$][\w$]*)['"]?)\s*:/);
    if (!match) {
      return;
    }

    properties.push({
      name: match[1],
      text: trimmed
    });
  }

  private indentProperty(text: string, propertyIndent: string): string {
    return text
      .split('\n')
      .map((line, index) => `${index === 0 ? propertyIndent : propertyIndent}${line.trimEnd()}`)
      .join('\n');
  }

  private findNextNonWhitespace(content: string, start: number): number {
    for (let i = start; i < content.length; i++) {
      if (!/\s/.test(content[i])) {
        return i;
      }
    }
    return -1;
  }

  private findTopLevelComma(content: string, start: number): number {
    let depth = 0;
    let quote: string | null = null;
    let escaped = false;

    for (let i = start; i < content.length; i++) {
      const char = content[i];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '"' || char === '\'' || char === '`') {
        quote = char;
        continue;
      }

      if (char === '(' || char === '{' || char === '[') {
        depth++;
        continue;
      }

      if (char === ')' && depth === 0) {
        return -1;
      }

      if (char === ')' || char === '}' || char === ']') {
        depth = Math.max(depth - 1, 0);
        continue;
      }

      if (char === ',' && depth === 0) {
        return i;
      }
    }

    return -1;
  }

  private findMatchingBracket(content: string, openIndex: number, openChar: string, closeChar: string): number {
    let depth = 0;
    let quote: string | null = null;
    let escaped = false;
    let lineComment = false;
    let blockComment = false;

    for (let i = openIndex; i < content.length; i++) {
      const char = content[i];
      const next = content[i + 1];

      if (lineComment) {
        if (char === '\n') {
          lineComment = false;
        }
        continue;
      }

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false;
          i++;
        }
        continue;
      }

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        lineComment = true;
        i++;
        continue;
      }

      if (char === '/' && next === '*') {
        blockComment = true;
        i++;
        continue;
      }

      if (char === '"' || char === '\'' || char === '`') {
        quote = char;
        continue;
      }

      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  private getLineIndent(content: string, index: number): string {
    const lineStart = content.lastIndexOf('\n', index) + 1;
    const linePrefix = content.slice(lineStart, index);
    return linePrefix.match(/^\s*/)?.[0] ?? '';
  }

  private applyReplacements(content: string, replacements: Replacement[]): string {
    return replacements
      .sort((a, b) => b.start - a.start)
      .reduce((result, replacement) => {
        return result.slice(0, replacement.start) + replacement.replacement + result.slice(replacement.end);
      }, content);
  }
}

