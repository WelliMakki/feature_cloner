/**
 * Structure scanner - recursively scans folder structure
 */

import * as path from 'path';
import { FileNode, scanDirectory, countNodes, getFileExtensions } from '../utils/fileSystem';
import { extractFeatureName } from '../utils/naming';

export interface ScannedStructure {
  rootPath: string;
  featureName: string;
  fileTree: FileNode;
  totalFiles: number;
  totalDirectories: number;
  fileExtensions: Set<string>;
  layers: string[];
}

export class StructureScanner {
  /**
   * Scan a folder and extract its structure
   */
  async scan(folderPath: string): Promise<ScannedStructure> {
    // Scan the directory tree
    const fileTree = await scanDirectory(folderPath);
    
    // Count nodes
    const counts = countNodes(fileTree);
    
    // Get file extensions
    const fileExtensions = getFileExtensions(fileTree);
    
    // Extract feature name from path
    const featureName = extractFeatureName(folderPath);
    
    // Extract layer names (top-level directories)
    const layers = this.extractLayers(fileTree);
    
    return {
      rootPath: folderPath,
      featureName,
      fileTree,
      totalFiles: counts.files,
      totalDirectories: counts.directories - 1, // Exclude root
      fileExtensions,
      layers
    };
  }

  /**
   * Extract layer names from the file tree
   */
  private extractLayers(fileTree: FileNode): string[] {
    if (!fileTree.children) {
      return [];
    }

    return fileTree.children
      .filter(child => child.isDirectory)
      .map(child => child.name);
  }

  /**
   * Get a summary of the scanned structure
   */
  getSummary(structure: ScannedStructure): string {
    const { featureName, totalFiles, totalDirectories, layers, fileExtensions } = structure;
    
    const lines: string[] = [];
    lines.push(`Feature: ${featureName}`);
    lines.push(`Files: ${totalFiles}, Directories: ${totalDirectories}`);
    
    if (layers.length > 0) {
      lines.push(`Layers: ${layers.join(', ')}`);
    }
    
    if (fileExtensions.size > 0) {
      const exts = Array.from(fileExtensions).join(', ');
      lines.push(`Extensions: ${exts}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate a tree visualization of the structure
   */
  generateTreeView(node: FileNode, prefix: string = '', isLast: boolean = true): string[] {
    const lines: string[] = [];
    
    // Current node
    const connector = isLast ? '└── ' : '├── ';
    const displayName = node.isDirectory ? `${node.name}/` : node.name;
    lines.push(prefix + connector + displayName);
    
    // Children
    if (node.children && node.children.length > 0) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      
      node.children.forEach((child, index) => {
        const childIsLast = index === node.children!.length - 1;
        const childLines = this.generateTreeView(child, newPrefix, childIsLast);
        lines.push(...childLines);
      });
    }
    
    return lines;
  }

  /**
   * Get file count per directory
   */
  getLayerStatistics(structure: ScannedStructure): Map<string, number> {
    const stats = new Map<string, number>();
    
    if (!structure.fileTree.children) {
      return stats;
    }

    for (const child of structure.fileTree.children) {
      if (child.isDirectory) {
        const count = countNodes(child).files;
        stats.set(child.name, count);
      }
    }
    
    return stats;
  }
}

