/**
 * Replaces copied Node.js controller/route business logic with editable stubs.
 */

import * as path from 'path';
import { toPascalCase } from '../utils/naming';

interface Replacement {
  start: number;
  end: number;
  replacement: string;
}

interface EndpointPlaceholderOptions {
  allowServiceLayer?: boolean;
}

export class NodeEndpointPlaceholderReplacer {
  replaceIfApplicable(content: string, filePath: string, options: EndpointPlaceholderOptions = {}): string {
    if (!this.isNodeEndpointFile(filePath)) {
      return content;
    }

    if (options.allowServiceLayer && this.isServiceFile(filePath)) {
      return this.replaceServiceMethods(content, filePath);
    }

    if (this.isControllerFile(filePath)) {
      return this.replaceControllerMethods(content, filePath, options);
    }

    const withControllerRoutes = this.replaceControllerRouteRegistrations(content, filePath);
    if (withControllerRoutes !== content) {
      return withControllerRoutes;
    }

    return this.replaceInlineRouteHandlers(content);
  }

  private isNodeEndpointFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.js', '.ts', '.cjs', '.mjs', '.cts', '.mts'].includes(ext)) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    return /\/(controllers?|routes?|services?)\//.test(normalizedPath) ||
      /(controller|route|service)s?\.(js|ts|cjs|mjs|cts|mts)$/.test(path.basename(filePath).toLowerCase());
  }

  private isControllerFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    return /\/controllers?\//.test(normalizedPath) ||
      /controllers?\.(js|ts|cjs|mjs|cts|mts)$/.test(path.basename(filePath).toLowerCase());
  }

  private isServiceFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    return /\/services?\//.test(normalizedPath) ||
      /services?\.(js|ts|cjs|mjs|cts|mts)$/.test(path.basename(filePath).toLowerCase());
  }

  private replaceControllerMethods(content: string, filePath: string, options: EndpointPlaceholderOptions): string {
    const serviceIdentifier = options.allowServiceLayer ? this.getServiceIdentifier(content) : undefined;
    const classPattern = /class\s+[A-Za-z_$][\w$]*\s*\{/m;
    const classMatch = classPattern.exec(content);
    if (!classMatch) {
      const replaced = this.replaceControllerMethodBodies(content, serviceIdentifier);
      return replaced.changed ? this.removeCommonAuthImports(replaced.content) : replaced.content;
    }

    const openBrace = classMatch.index + classMatch[0].lastIndexOf('{');
    const closeBrace = this.findMatchingBrace(content, openBrace);
    if (closeBrace === -1) {
      const replaced = this.replaceControllerMethodBodies(content, serviceIdentifier);
      return replaced.changed ? this.removeCommonAuthImports(replaced.content) : replaced.content;
    }

    const classIndent = this.getLineIndent(content, openBrace);
    const methodIndent = `${classIndent}  `;
    const names = this.getCrudMethodNames(content, filePath);
    const methods = [
      this.buildControllerMethod(names.create, methodIndent, serviceIdentifier),
      this.buildControllerMethod(names.getAll, methodIndent, serviceIdentifier),
      this.buildControllerMethod(names.getById, methodIndent, serviceIdentifier),
      this.buildControllerMethod(names.update, methodIndent, serviceIdentifier),
      this.buildControllerMethod(names.delete, methodIndent, serviceIdentifier)
    ].join('\n\n');

    const replacedClassBody = `${content.slice(0, openBrace + 1)}\n${methods}\n${classIndent}${content.slice(closeBrace)}`;
    return this.removeCommonAuthImports(replacedClassBody);
  }

  private replaceControllerMethodBodies(content: string, serviceIdentifier?: string): { content: string; changed: boolean } {
    return this.replaceFunctionBodies(
      content,
      true,
      (methodName, indent) => this.buildControllerBody(methodName, indent, serviceIdentifier)
    );
  }

  private replaceServiceMethods(content: string, filePath: string): string {
    const classPattern = /class\s+[A-Za-z_$][\w$]*\s*\{/m;
    const classMatch = classPattern.exec(content);
    if (!classMatch) {
      const replaced = this.replaceFunctionBodies(
        content,
        false,
        (methodName, indent) => this.buildServiceBody(methodName, indent)
      );
      return this.removeTopLevelImports(replaced.content);
    }

    const openBrace = classMatch.index + classMatch[0].lastIndexOf('{');
    const closeBrace = this.findMatchingBrace(content, openBrace);
    if (closeBrace === -1) {
      const replaced = this.replaceFunctionBodies(
        content,
        false,
        (methodName, indent) => this.buildServiceBody(methodName, indent)
      );
      return replaced.content;
    }

    const classIndent = this.getLineIndent(content, openBrace);
    const methodIndent = `${classIndent}  `;
    const names = this.getCrudMethodNames(content, filePath);
    const methods = [
      this.buildServiceMethod(names.create, methodIndent),
      this.buildServiceMethod(names.getAll, methodIndent),
      this.buildServiceMethod(names.getById, methodIndent),
      this.buildServiceMethod(names.update, methodIndent),
      this.buildServiceMethod(names.delete, methodIndent)
    ].join('\n\n');

    const replaced = `${content.slice(0, openBrace + 1)}\n${methods}\n${classIndent}${content.slice(closeBrace)}`;
    return this.removeTopLevelImports(replaced);
  }

  private removeCommonAuthImports(content: string): string {
    return content
      .replace(/^\s*const\s+bcrypt\s*=\s*require\(['"]bcrypt['"]\);\s*\n/gm, '')
      .replace(/^\s*import\s+(?:\*\s+as\s+)?bcrypt\b.*from\s+['"]bcrypt['"];\s*\n/gm, '');
  }

  private removeTopLevelImports(content: string): string {
    return content
      .replace(/^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*require\([^)]*\);\s*\n/gm, '')
      .replace(/^\s*import\s+[^;]+from\s+['"][^'"]+['"];\s*\n/gm, '');
  }

  private replaceInlineRouteHandlers(content: string): string {
    const replacements: Replacement[] = [];
    const routeHandlerPattern = /(^[ \t]*)(?:router|app)\.(?:get|post|put|patch|delete)\s*\([^;]*?(?:async\s*)?\([^)]*\)\s*=>\s*\{/gm;
    let match: RegExpExecArray | null;

    while ((match = routeHandlerPattern.exec(content)) !== null) {
      const signature = match[0];
      if (!signature.includes('req') || !signature.includes('res')) {
        continue;
      }

      const openBrace = routeHandlerPattern.lastIndex - 1;
      const closeBrace = this.findMatchingBrace(content, openBrace);
      if (closeBrace === -1) {
        continue;
      }

      replacements.push({
        start: openBrace + 1,
        end: closeBrace,
        replacement: this.buildHandlerBody(match[1])
      });
    }

    return this.applyReplacements(content, replacements);
  }

  private replaceControllerRouteRegistrations(content: string, filePath: string): string {
    const lines = content.split('\n');
    const routeLinePattern = /^(\s*)(router|app)\.(?:get|post|put|patch|delete)\s*\(/;
    const firstRouteIndex = lines.findIndex(line => routeLinePattern.test(line));

    if (firstRouteIndex === -1) {
      return content;
    }

    const routeLine = lines[firstRouteIndex];
    const routeMatch = routeLine.match(routeLinePattern);
    const indent = routeLine.match(/^\s*/)?.[0] ?? '';
    const routerIdentifier = routeMatch?.[2] ?? 'router';
    const controllerIdentifier = this.getControllerIdentifier(content);
    const names = this.getCrudMethodNames(content, filePath);
    const withoutRoutes = lines.filter(line => !routeLinePattern.test(line));
    const controllerAccessor = controllerIdentifier ?? 'controller';
    const generatedRoutes = [
      `${indent}// Route scaffold: adjust paths/middleware to match your API contract.`,
      `${indent}// Example: ${routerIdentifier}.post('/', authMiddleware, ${controllerAccessor}.${names.create});`,
      `${indent}${routerIdentifier}.post('/', ${controllerAccessor}.${names.create});`,
      `${indent}${routerIdentifier}.get('/', ${controllerAccessor}.${names.getAll});`,
      `${indent}${routerIdentifier}.get('/:id', ${controllerAccessor}.${names.getById});`,
      `${indent}${routerIdentifier}.put('/:id', ${controllerAccessor}.${names.update});`,
      `${indent}${routerIdentifier}.delete('/:id', ${controllerAccessor}.${names.delete});`
    ];
    withoutRoutes.splice(
      firstRouteIndex,
      0,
      ...generatedRoutes
    );

    return withoutRoutes.join('\n');
  }

  private getControllerIdentifier(content: string): string | undefined {
    const requirePattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
    let requireMatch: RegExpExecArray | null;
    while ((requireMatch = requirePattern.exec(content)) !== null) {
      const identifier = requireMatch[1];
      const source = requireMatch[2]?.toLowerCase() ?? '';
      if (source.includes('controller') || identifier.toLowerCase().includes('controller')) {
        return identifier;
      }
    }

    const importPattern = /\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importPattern.exec(content)) !== null) {
      const identifier = importMatch[1];
      const source = importMatch[2]?.toLowerCase() ?? '';
      if (source.includes('controller') || identifier.toLowerCase().includes('controller')) {
        return identifier;
      }
    }

    const anyRequireMatch = content.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\([^)]*\)/);
    if (anyRequireMatch?.[1]) {
      return anyRequireMatch[1];
    }

    const anyImportDefaultMatch = content.match(/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+['"]/);
    if (anyImportDefaultMatch?.[1]) {
      return anyImportDefaultMatch[1];
    }

    return undefined;
  }

  private getServiceIdentifier(content: string): string | undefined {
    const requireMatch = content.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"][^'"]*service[^'"]*['"]\s*\)/i);
    if (requireMatch?.[1]) {
      return requireMatch[1];
    }

    const importDefaultMatch = content.match(/\bimport\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]*service[^'"]*['"]/i);
    if (importDefaultMatch?.[1]) {
      return importDefaultMatch[1];
    }

    return undefined;
  }

  private buildControllerMethod(name: string, baseIndent: string, serviceIdentifier?: string): string {
    return `${baseIndent}async ${name}(req, res) {${this.buildControllerBody(name, baseIndent, serviceIdentifier)}}`;
  }

  private buildServiceMethod(name: string, baseIndent: string): string {
    return `${baseIndent}async ${name}(...args) {${this.buildServiceBody(name, baseIndent)}}`;
  }

  private getCrudMethodNames(content: string, filePath: string): {
    create: string;
    getAll: string;
    getById: string;
    update: string;
    delete: string;
  } {
    const featureName = this.inferFeatureName(content, filePath);
    const featureToken = this.toSingularPascalCase(featureName);
    return {
      create: `create${featureToken}`,
      getAll: `get${featureToken}`,
      getById: `get${featureToken}ById`,
      update: `update${featureToken}`,
      delete: `delete${featureToken}`
    };
  }

  private inferFeatureName(content: string, filePath: string): string {
    const classMatch = content.match(/\bclass\s+([A-Za-z_$][\w$]*?)Controller\b/);
    if (classMatch?.[1]) {
      return classMatch[1];
    }

    const controllerVariableMatch = content.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)Controller\b/);
    if (controllerVariableMatch?.[1]) {
      return controllerVariableMatch[1];
    }

    const controllerImportPattern = /['"]([^'"]*controller[^'"]*)['"]/gi;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = controllerImportPattern.exec(content)) !== null) {
      const source = importMatch[1];
      const sourceBase = path.basename(source, path.extname(source));
      const withoutControllerSuffix = sourceBase.replace(
        /(?:[_-]?(?:controller|controllers))$/i,
        ''
      );
      if (withoutControllerSuffix && withoutControllerSuffix !== sourceBase) {
        return withoutControllerSuffix;
      }
    }

    const baseName = path.basename(filePath, path.extname(filePath));
    const withoutSuffix = baseName.replace(/(?:controller|controllers|route|routes|service|services)$/i, '');
    return withoutSuffix || 'item';
  }

  private toSingularPascalCase(value: string): string {
    const tokens = value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return 'Item';
    }

    const lastIndex = tokens.length - 1;
    tokens[lastIndex] = this.toSingularToken(tokens[lastIndex]);
    return toPascalCase(tokens.join(' '));
  }

  private toSingularToken(token: string): string {
    const lower = token.toLowerCase();
    if (lower.length <= 1) {
      return token;
    }

    if (lower.endsWith('ies') && lower.length > 3) {
      return `${token.slice(0, -3)}y`;
    }

    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') || lower.endsWith('ches') || lower.endsWith('shes')) {
      return token.slice(0, -2);
    }

    if (lower.endsWith('s') && !lower.endsWith('ss')) {
      return token.slice(0, -1);
    }

    return token;
  }

  private buildHandlerBody(baseIndent: string): string {
    const one = `${baseIndent}  `;
    const two = `${baseIndent}    `;
    return `\n${one}try {\n${two}// Validate request input and call your domain/service layer.\n${two}// Return consistent API payloads (e.g. { success, data, message }).\n${two}res.json({ success: true, data: {} });\n${one}} catch (error) {\n${two}const message = error instanceof Error ? error.message : String(error);\n${two}res.status(500).json({ success: false, message, data: null });\n${one}}\n${baseIndent}`;
  }

  private buildControllerBody(methodName: string, baseIndent: string, serviceIdentifier?: string): string {
    if (!serviceIdentifier) {
      return this.buildHandlerBody(baseIndent);
    }

    const invocation = this.buildServiceInvocation(methodName, serviceIdentifier);
    const one = `${baseIndent}  `;
    const two = `${baseIndent}    `;
    return `\n${one}try {\n${two}// Keep controller thin: map request params/body, then delegate to service.\n${two}const result = await ${invocation};\n${two}res.json(result);\n${one}} catch (error) {\n${two}const message = error instanceof Error ? error.message : String(error);\n${two}res.status(500).json({ success: false, message, data: null });\n${one}}\n${baseIndent}`;
  }

  private buildServiceInvocation(methodName: string, serviceIdentifier: string): string {
    const lower = methodName.toLowerCase();
    if (lower.startsWith('create')) {
      return `${serviceIdentifier}.${methodName}(req.body)`;
    }
    if (lower.startsWith('get') && lower.endsWith('byid')) {
      return `${serviceIdentifier}.${methodName}(req.params.id)`;
    }
    if (lower.startsWith('update')) {
      return `${serviceIdentifier}.${methodName}(req.params.id, req.body)`;
    }
    if (lower.startsWith('delete') || lower.startsWith('remove')) {
      return `${serviceIdentifier}.${methodName}(req.params.id)`;
    }
    if (lower.startsWith('get') || lower.startsWith('list') || lower.startsWith('fetch')) {
      return `${serviceIdentifier}.${methodName}(req.query)`;
    }
    return `${serviceIdentifier}.${methodName}(req.body)`;
  }

  private buildServiceBody(methodName: string, baseIndent: string): string {
    const one = `${baseIndent}  `;
    const two = `${baseIndent}    `;
    const responseValue = this.getServiceDefaultReturn(methodName);
    return `\n${one}try {\n${two}// Add DB calls and business rules here (transactions/validation/authorization).\n${two}// Keep return shape stable so controller responses stay predictable.\n${two}return { success: true, data: ${responseValue} };\n${one}} catch (error) {\n${two}const message = error instanceof Error ? error.message : String(error);\n${two}return { success: false, message, data: null };\n${one}}\n${baseIndent}`;
  }

  private getServiceDefaultReturn(methodName: string): string {
    const lower = methodName.toLowerCase();
    if (lower.startsWith('get') && lower.endsWith('byid')) {
      return 'null';
    }
    if (lower.startsWith('get') || lower.startsWith('list') || lower.startsWith('fetch')) {
      return '[]';
    }
    if (lower.startsWith('delete') || lower.startsWith('remove')) {
      return 'true';
    }
    return '{}';
  }

  private replaceFunctionBodies(
    content: string,
    requireReqRes: boolean,
    bodyBuilder: (methodName: string, indent: string) => string
  ): { content: string; changed: boolean } {
    const replacements: Replacement[] = [];
    this.collectBodyReplacements(
      content,
      /(^[ \t]*)(?:async\s+)?(?!if\b|for\b|while\b|switch\b|catch\b)([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm,
      requireReqRes,
      bodyBuilder,
      replacements
    );
    this.collectBodyReplacements(
      content,
      /(^[ \t]*)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/gm,
      requireReqRes,
      bodyBuilder,
      replacements
    );

    if (replacements.length === 0) {
      return { content, changed: false };
    }

    return {
      content: this.applyReplacements(content, replacements),
      changed: true
    };
  }

  private collectBodyReplacements(
    content: string,
    pattern: RegExp,
    requireReqRes: boolean,
    bodyBuilder: (methodName: string, indent: string) => string,
    replacements: Replacement[]
  ): void {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const signature = match[0];
      if (requireReqRes && (!signature.includes('req') || !signature.includes('res'))) {
        continue;
      }

      const openBrace = pattern.lastIndex - 1;
      const closeBrace = this.findMatchingBrace(content, openBrace);
      if (closeBrace === -1) {
        continue;
      }

      const indent = match[1] ?? '';
      const methodName = match[2] ?? '';
      replacements.push({
        start: openBrace + 1,
        end: closeBrace,
        replacement: bodyBuilder(methodName, indent)
      });
    }
  }

  private findMatchingBrace(content: string, openIndex: number): number {
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

      if (char === '{') {
        depth++;
      } else if (char === '}') {
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

