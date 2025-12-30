/**
 * File system utility functions
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

/**
 * Recursively scan a directory and build a file tree
 */
export async function scanDirectory(dirPath: string): Promise<FileNode> {
  const stats = await fs.promises.stat(dirPath);
  const name = path.basename(dirPath);

  if (!stats.isDirectory()) {
    return {
      name,
      path: dirPath,
      isDirectory: false
    };
  }

  const entries = await fs.promises.readdir(dirPath);
  const children: FileNode[] = [];

  for (const entry of entries) {
    // Skip hidden files and common ignore patterns
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === 'build') {
      continue;
    }

    const entryPath = path.join(dirPath, entry);
    try {
      const childNode = await scanDirectory(entryPath);
      children.push(childNode);
    } catch (error) {
      // Skip files we can't access
      continue;
    }
  }

  return {
    name,
    path: dirPath,
    isDirectory: true,
    children: children.sort((a, b) => {
      // Directories first, then files
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    })
  };
}

/**
 * Count files and directories in a tree
 */
export function countNodes(node: FileNode): { files: number; directories: number } {
  if (!node.isDirectory) {
    return { files: 1, directories: 0 };
  }

  let files = 0;
  let directories = 1; // Count this directory

  if (node.children) {
    for (const child of node.children) {
      const childCounts = countNodes(child);
      files += childCounts.files;
      directories += childCounts.directories;
    }
  }

  return { files, directories };
}

/**
 * Get all file extensions in a tree
 */
export function getFileExtensions(node: FileNode): Set<string> {
  const extensions = new Set<string>();

  if (!node.isDirectory) {
    const ext = path.extname(node.name);
    if (ext) {
      extensions.add(ext);
    }
    return extensions;
  }

  if (node.children) {
    for (const child of node.children) {
      const childExtensions = getFileExtensions(child);
      childExtensions.forEach(ext => extensions.add(ext));
    }
  }

  return extensions;
}

/**
 * Create directory recursively if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

/**
 * Check if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content as string
 */
export async function readFileContent(filePath: string): Promise<string> {
  return await fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Write file content
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

/**
 * Get all file paths in a tree (flat list)
 */
export function getAllFilePaths(node: FileNode, relativeTo?: string): string[] {
  const paths: string[] = [];

  if (!node.isDirectory) {
    const filePath = relativeTo 
      ? path.relative(relativeTo, node.path)
      : node.path;
    paths.push(filePath);
    return paths;
  }

  if (node.children) {
    for (const child of node.children) {
      paths.push(...getAllFilePaths(child, relativeTo));
    }
  }

  return paths;
}

