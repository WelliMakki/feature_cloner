import * as fs from 'fs';
import * as path from 'path';
import { FileNode } from '../../utils/fileSystem';
import { CloneContext, StackCloneOptions } from '../cloneContext';
import { CloneHandler } from './cloneHandler';

export class NodeCloneHandler implements CloneHandler {
  id = 'node';

  async canHandle(context: CloneContext): Promise<boolean> {
    const patternName = context.pattern.name.toLowerCase();
    const isKnownNodePattern = patternName.includes('express') || patternName.includes('node');
    const schemaCandidates = this.getNodeSchemaCandidateFiles(context.structure.fileTree);
    const endpointCandidates = this.getNodeEndpointCandidateFiles(context.structure.fileTree);
    const candidates = [...schemaCandidates, ...endpointCandidates];

    if (!isKnownNodePattern && candidates.length === 0) {
      return false;
    }

    for (const candidate of candidates) {
      try {
        const content = await fs.promises.readFile(candidate.path, 'utf-8');
        if (this.hasNodeSchemaContent(content)) {
          return true;
        }
        if (this.hasNodeEndpointContent(content)) {
          return true;
        }
      } catch {
        // Ignore unreadable files; the clone step will handle real read failures.
      }
    }

    return false;
  }

  async collectOptions(context: CloneContext): Promise<StackCloneOptions | undefined> {
    const hasServiceLayer = context.structure.layers.some(layer => /^(service|services)$/i.test(layer));
    return {
      nodeSchemaFieldMode: 'placeholder',
      nodeIncludeServiceLayerFiles: hasServiceLayer,
      nodeEnableServiceLayerPlaceholders: hasServiceLayer
    };
  }

  private getNodeSchemaCandidateFiles(node: FileNode): FileNode[] {
    if (!node.isDirectory) {
      return this.isNodeSchemaCandidate(node) ? [node] : [];
    }

    const candidates: FileNode[] = [];
    for (const child of node.children ?? []) {
      candidates.push(...this.getNodeSchemaCandidateFiles(child));
    }
    return candidates;
  }

  private getNodeEndpointCandidateFiles(node: FileNode): FileNode[] {
    if (!node.isDirectory) {
      return this.isNodeEndpointCandidate(node) ? [node] : [];
    }

    const candidates: FileNode[] = [];
    for (const child of node.children ?? []) {
      candidates.push(...this.getNodeEndpointCandidateFiles(child));
    }
    return candidates;
  }

  private isNodeSchemaCandidate(node: FileNode): boolean {
    const ext = path.extname(node.name).toLowerCase();
    if (!['.js', '.ts', '.cjs', '.mjs', '.cts', '.mts'].includes(ext)) {
      return false;
    }

    const normalizedPath = node.path.replace(/\\/g, '/').toLowerCase();
    const fileName = node.name.toLowerCase();
    return /\/(models?|schemas?|entities?)\//.test(normalizedPath) ||
      /(model|schema|entity)\.(js|ts|cjs|mjs|cts|mts)$/.test(fileName);
  }

  private hasNodeSchemaContent(content: string): boolean {
    return /new\s+(?:mongoose\.)?Schema\s*\(/.test(content) ||
      /mongoose\.model\s*\(/.test(content) ||
      /sequelize\.define\s*\(/.test(content) ||
      /\bDataTypes\.[A-Za-z]+/.test(content) ||
      /@Schema\s*\(/.test(content);
  }

  private isNodeEndpointCandidate(node: FileNode): boolean {
    const ext = path.extname(node.name).toLowerCase();
    if (!['.js', '.ts', '.cjs', '.mjs', '.cts', '.mts'].includes(ext)) {
      return false;
    }

    const normalizedPath = node.path.replace(/\\/g, '/').toLowerCase();
    const fileName = node.name.toLowerCase();
    return /\/(controllers?|routes?|services?)\//.test(normalizedPath) ||
      /(controller|route|service)s?\.(js|ts|cjs|mjs|cts|mts)$/.test(fileName);
  }

  private hasNodeEndpointContent(content: string): boolean {
    return /\b(?:router|app)\.(?:get|post|put|patch|delete)\s*\(/.test(content) ||
      /\b(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\breq\b[^)]*\bres\b[^)]*\)\s*\{/.test(content);
  }
}

