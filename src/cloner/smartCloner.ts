/**
 * Smart cloner - clones folder structure with intelligent name replacement
 */

import * as path from 'path';
import { FileNode } from '../utils/fileSystem';
import { ensureDirectory, readFileContent, writeFileContent, pathExists } from '../utils/fileSystem';
import { ContentReplacer } from './contentReplacer';
import { ScannedStructure } from '../scanner/structureScanner';

export type CloneScopeMode = 'full' | 'subfolders';

export interface CloneOptions {
  sourceFeatureName: string;
  targetFeatureName: string;
  targetDirectory: string;
  scopeMode?: CloneScopeMode;
  selectedSubfolders?: string[];
  allowMergeIntoExistingRoot?: boolean;
  dryRun?: boolean;
}

export interface CloneResult {
  success: boolean;
  filesCreated: number;
  directoriesCreated: number;
  errors: string[];
  createdPaths: string[];
}

export class SmartCloner {
  private contentReplacer: ContentReplacer;

  constructor() {
    this.contentReplacer = new ContentReplacer();
  }

  /**
   * Clone a feature structure to a new location with renamed content
   */
  async clone(structure: ScannedStructure, options: CloneOptions): Promise<CloneResult> {
    const result: CloneResult = {
      success: true,
      filesCreated: 0,
      directoriesCreated: 0,
      errors: [],
      createdPaths: []
    };

    try {
      const normalizedOptions = this.normalizeOptions(options);

      // Determine target path
      const targetPath = path.join(
        normalizedOptions.targetDirectory,
        normalizedOptions.targetFeatureName
      );

      // Check if target already exists
      const targetExists = await pathExists(targetPath);
      if (targetExists && !normalizedOptions.allowMergeIntoExistingRoot) {
        result.success = false;
        result.errors.push(`Target directory already exists: ${targetPath}`);
        return result;
      }

      // Clone the structure
      await this.cloneNode(
        structure.fileTree,
        targetPath,
        normalizedOptions,
        result
      );

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Clone failed: ${error}`);
    }

    return result;
  }

  /**
   * Recursively clone a file node
   */
  private async cloneNode(
    node: FileNode,
    targetPath: string,
    options: CloneOptions,
    result: CloneResult,
    relativePathFromRoot: string = ''
  ): Promise<void> {
    try {
      if (node.isDirectory) {
        // Always create directory (even if it might be empty)
        if (!options.dryRun) {
          await ensureDirectory(targetPath);
        }
        result.directoriesCreated++;
        result.createdPaths.push(targetPath);

        // Clone children
        if (node.children) {
          for (const child of node.children) {
            const childRelativePath = relativePathFromRoot
              ? path.posix.join(relativePathFromRoot, child.name)
              : child.name;

            if (!this.shouldIncludeInScope(child, childRelativePath, options)) {
              continue;
            }

            // Replace feature name in child path
            const childName = this.contentReplacer.replaceInPath(
              child.name,
              options.sourceFeatureName,
              options.targetFeatureName
            );
            const childPath = path.join(targetPath, childName);
            
            // For directories, always clone. For files, check if it should be cloned
            if (child.isDirectory || this.shouldCloneFile(child, options)) {
              await this.cloneNode(child, childPath, options, result, childRelativePath);
            }
          }
        }
      } else {
        // Clone file only if it contains the feature name
        await this.cloneFile(node, targetPath, options, result);
      }
    } catch (error) {
      result.errors.push(`Error cloning ${node.path}: ${error}`);
    }
  }

  /**
   * Check if a file should be cloned (contains feature name in path or content)
   */
  private shouldCloneFile(node: FileNode, options: CloneOptions): boolean {
    if (node.isDirectory) {
      return true; // Directories are handled separately
    }

    const featureTokens = this.tokenize(options.sourceFeatureName);
    const fileTokens = this.tokenize(node.name);

    if (this.hasFeatureTokenSequence(fileTokens, featureTokens)) {
      return true;
    }

    // Keep a compact fallback for filenames without separators.
    const compactFileName = this.normalizeCompact(node.name);
    const compactFeatureName = this.normalizeCompact(options.sourceFeatureName);
    return compactFeatureName.length > 0 && compactFileName.includes(compactFeatureName);
  }

  /**
   * Clone a single file with content replacement
   */
  private async cloneFile(
    sourceNode: FileNode,
    targetPath: string,
    options: CloneOptions,
    result: CloneResult
  ): Promise<void> {
    try {
      // Read source file content
      const content = await readFileContent(sourceNode.path);

      // Replace feature names in content
      const newContent = this.contentReplacer.replaceContent(
        content,
        options.sourceFeatureName,
        options.targetFeatureName
      );

      // Write to target
      if (!options.dryRun) {
        await writeFileContent(targetPath, newContent);
      }

      result.filesCreated++;
      result.createdPaths.push(targetPath);
    } catch (error) {
      result.errors.push(`Error cloning file ${sourceNode.path}: ${error}`);
    }
  }

  /**
   * Preview what would be created
   */
  async preview(structure: ScannedStructure, options: CloneOptions): Promise<string[]> {
    const normalizedOptions = this.normalizeOptions(options);
    const targetPath = path.join(
      normalizedOptions.targetDirectory,
      normalizedOptions.targetFeatureName
    );

    const paths: string[] = [];
    this.collectPaths(structure.fileTree, targetPath, normalizedOptions, paths);
    
    return paths;
  }

  /**
   * Collect all paths that would be created
   */
  private collectPaths(
    node: FileNode,
    targetPath: string,
    options: CloneOptions,
    paths: string[],
    relativePathFromRoot: string = ''
  ): void {
    // Always add the path (directory or file)
    paths.push(targetPath);

    if (node.isDirectory && node.children) {
      for (const child of node.children) {
        const childRelativePath = relativePathFromRoot
          ? path.posix.join(relativePathFromRoot, child.name)
          : child.name;

        if (!this.shouldIncludeInScope(child, childRelativePath, options)) {
          continue;
        }

        // Only include files that contain the feature name, but always include directories
        if (child.isDirectory || this.shouldCloneFile(child, options)) {
          const childName = this.contentReplacer.replaceInPath(
            child.name,
            options.sourceFeatureName,
            options.targetFeatureName
          );
          const childPath = path.join(targetPath, childName);
          this.collectPaths(child, childPath, options, paths, childRelativePath);
        }
      }
    }
  }

  /**
   * Normalize option defaults.
   */
  private normalizeOptions(options: CloneOptions): CloneOptions {
    const scopeMode = options.scopeMode ?? 'full';
    const selectedSubfolders = (options.selectedSubfolders ?? []).filter(Boolean);
    return {
      ...options,
      scopeMode,
      selectedSubfolders
    };
  }

  /**
   * Determines if a node is included by the selected clone scope.
   */
  private shouldIncludeInScope(node: FileNode, relativePathFromRoot: string, options: CloneOptions): boolean {
    if (options.scopeMode !== 'subfolders') {
      return true;
    }

    const selected = new Set((options.selectedSubfolders ?? []).map(folder => folder.toLowerCase()));
    if (selected.size === 0) {
      return true;
    }

    const firstSegment = relativePathFromRoot.split(/[\\/]/)[0]?.toLowerCase();
    if (!firstSegment) {
      return false;
    }

    // In subfolder mode we only clone selected top-level directories.
    if (!selected.has(firstSegment)) {
      return false;
    }

    // Protect against selecting files in the future; keep behavior folder-oriented.
    if (!node.isDirectory && !relativePathFromRoot.includes('/') && !relativePathFromRoot.includes('\\')) {
      return false;
    }

    return true;
  }

  /**
   * Split names into searchable lowercase tokens.
   */
  private tokenize(value: string): string[] {
    const withoutExtension = value.replace(/\.[^.]+$/, '');
    return withoutExtension
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/[-_.\s]+/g, ' ')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * Match feature tokens as an ordered sequence in file tokens.
   */
  private hasFeatureTokenSequence(fileTokens: string[], featureTokens: string[]): boolean {
    if (featureTokens.length === 0 || fileTokens.length < featureTokens.length) {
      return false;
    }

    for (let i = 0; i <= fileTokens.length - featureTokens.length; i++) {
      let matches = true;
      for (let j = 0; j < featureTokens.length; j++) {
        if (!this.tokensMatch(fileTokens[i + j], featureTokens[j])) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Compare tokens with common singular/plural inflections.
   */
  private tokensMatch(fileToken: string, featureToken: string): boolean {
    if (fileToken === featureToken) {
      return true;
    }

    const fileForms = this.getTokenForms(fileToken);
    const featureForms = this.getTokenForms(featureToken);

    for (const form of fileForms) {
      if (featureForms.has(form)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate common inflection variants for a token.
   */
  private getTokenForms(token: string): Set<string> {
    const forms = new Set<string>();
    const normalized = token.toLowerCase();
    if (!normalized) {
      return forms;
    }

    forms.add(normalized);

    if (normalized.endsWith('ies') && normalized.length > 3) {
      forms.add(normalized.slice(0, -3) + 'y');
    }

    if (normalized.endsWith('es') && normalized.length > 2) {
      forms.add(normalized.slice(0, -2));
    }

    if (normalized.endsWith('s') && normalized.length > 1) {
      forms.add(normalized.slice(0, -1));
    }

    if (normalized.endsWith('y') && normalized.length > 1) {
      forms.add(normalized.slice(0, -1) + 'ies');
    }

    forms.add(`${normalized}s`);
    forms.add(`${normalized}es`);

    return forms;
  }

  /**
   * Remove separators for compact fallback matching.
   */
  private normalizeCompact(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  /**
   * Generate a preview of file content changes
   */
  async previewContentChanges(
    structure: ScannedStructure,
    options: CloneOptions,
    maxFiles: number = 5
  ): Promise<Array<{ file: string; hasChanges: boolean; preview: string }>> {
    const previews: Array<{ file: string; hasChanges: boolean; preview: string }> = [];

    await this.previewNode(structure.fileTree, options, previews, maxFiles);

    return previews;
  }

  /**
   * Preview changes for a node
   */
  private async previewNode(
    node: FileNode,
    options: CloneOptions,
    previews: Array<{ file: string; hasChanges: boolean; preview: string }>,
    maxFiles: number
  ): Promise<void> {
    if (previews.length >= maxFiles) {
      return;
    }

    if (!node.isDirectory) {
      try {
        const content = await readFileContent(node.path);
        const hasFeatureName = this.contentReplacer.containsFeatureName(
          content,
          options.sourceFeatureName
        );

        if (hasFeatureName) {
          const replacements = this.contentReplacer.previewReplacements(
            content,
            options.sourceFeatureName,
            options.targetFeatureName
          );

          if (replacements.length > 0) {
            const preview = replacements
              .map(r => `  Line ${r.line}: ${r.old} → ${r.new}`)
              .join('\n');

            previews.push({
              file: node.name,
              hasChanges: true,
              preview
            });
          }
        }
      } catch (error) {
        // Skip files we can't read
      }
    } else if (node.children) {
      for (const child of node.children) {
        await this.previewNode(child, options, previews, maxFiles);
        if (previews.length >= maxFiles) {
          break;
        }
      }
    }
  }
}

