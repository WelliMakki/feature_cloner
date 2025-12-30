/**
 * Smart cloner - clones folder structure with intelligent name replacement
 */

import * as path from 'path';
import { FileNode } from '../utils/fileSystem';
import { ensureDirectory, readFileContent, writeFileContent, pathExists } from '../utils/fileSystem';
import { ContentReplacer } from './contentReplacer';
import { ScannedStructure } from '../scanner/structureScanner';

export interface CloneOptions {
  sourceFeatureName: string;
  targetFeatureName: string;
  targetDirectory: string;
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
      // Determine target path
      const targetPath = path.join(
        options.targetDirectory,
        options.targetFeatureName
      );

      // Check if target already exists
      if (await pathExists(targetPath)) {
        result.success = false;
        result.errors.push(`Target directory already exists: ${targetPath}`);
        return result;
      }

      // Clone the structure
      await this.cloneNode(
        structure.fileTree,
        targetPath,
        options,
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
    result: CloneResult
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
            // Replace feature name in child path
            const childName = this.contentReplacer.replaceInPath(
              child.name,
              options.sourceFeatureName,
              options.targetFeatureName
            );
            const childPath = path.join(targetPath, childName);
            
            // For directories, always clone. For files, check if it should be cloned
            if (child.isDirectory || this.shouldCloneFile(child, options)) {
              await this.cloneNode(child, childPath, options, result);
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

    // Check if filename contains the feature name
    const fileName = node.name.toLowerCase();
    const featureName = options.sourceFeatureName.toLowerCase();
    
    // Convert feature name to various formats for matching
    const variations = [
      featureName,
      featureName.replace(/_/g, ''),
      featureName.replace(/-/g, ''),
    ];

    // Check if any variation exists in the filename
    return variations.some(variation => fileName.includes(variation));
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
    const targetPath = path.join(
      options.targetDirectory,
      options.targetFeatureName
    );

    const paths: string[] = [];
    this.collectPaths(structure.fileTree, targetPath, options, paths);
    
    return paths;
  }

  /**
   * Collect all paths that would be created
   */
  private collectPaths(
    node: FileNode,
    targetPath: string,
    options: CloneOptions,
    paths: string[]
  ): void {
    // Always add the path (directory or file)
    paths.push(targetPath);

    if (node.isDirectory && node.children) {
      for (const child of node.children) {
        // Only include files that contain the feature name, but always include directories
        if (child.isDirectory || this.shouldCloneFile(child, options)) {
          const childName = this.contentReplacer.replaceInPath(
            child.name,
            options.sourceFeatureName,
            options.targetFeatureName
          );
          const childPath = path.join(targetPath, childName);
          this.collectPaths(child, childPath, options, paths);
        }
      }
    }
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
    let count = 0;

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

