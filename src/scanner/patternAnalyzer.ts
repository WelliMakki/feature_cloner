/**
 * Pattern analyzer - detects architecture patterns
 */

import { ScannedStructure } from './structureScanner';
import { 
  ArchitecturePattern, 
  LayerInfo, 
  ARCHITECTURE_RULES, 
  DetectionRule 
} from './architectureTypes';
import { FileNode, countNodes } from '../utils/fileSystem';

export class PatternAnalyzer {
  /**
   * Analyze a scanned structure and detect architecture pattern
   */
  analyze(structure: ScannedStructure): ArchitecturePattern {
    // Try to match against known patterns
    const matches = this.matchPatterns(structure);
    
    if (matches.length > 0) {
      // Return the best match
      const bestMatch = matches[0];
      return this.createPattern(bestMatch.rule, structure, bestMatch.confidence);
    }
    
    // No known pattern matched, create a generic pattern
    return this.createGenericPattern(structure);
  }

  /**
   * Match structure against known architecture patterns
   */
  private matchPatterns(structure: ScannedStructure): Array<{ rule: DetectionRule; confidence: number }> {
    const matches: Array<{ rule: DetectionRule; confidence: number }> = [];
    
    for (const rule of ARCHITECTURE_RULES) {
      const confidence = this.calculateConfidence(structure, rule);
      if (confidence >= rule.minConfidence) {
        matches.push({ rule, confidence });
      }
    }
    
    // Sort by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }

  /**
   * Calculate confidence score for a pattern match
   */
  private calculateConfidence(structure: ScannedStructure, rule: DetectionRule): number {
    let score = 0;
    let maxScore = 0;
    
    // Check folder patterns
    const folderWeight = 40;
    maxScore += folderWeight;
    const matchedFolders = rule.folderPatterns.filter(pattern => 
      structure.layers.some(layer => layer.toLowerCase().includes(pattern.toLowerCase()))
    );
    score += (matchedFolders.length / rule.folderPatterns.length) * folderWeight;
    
    // Check file patterns
    const fileWeight = 40;
    maxScore += fileWeight;
    const allFiles = this.getAllFileNames(structure.fileTree);
    const matchedFiles = rule.filePatterns.filter(pattern => 
      allFiles.some(file => file.toLowerCase().includes(pattern.toLowerCase()))
    );
    if (rule.filePatterns.length > 0) {
      score += (matchedFiles.length / rule.filePatterns.length) * fileWeight;
    }
    
    // Check file extensions
    const extWeight = 20;
    maxScore += extWeight;
    const extensions = Array.from(structure.fileExtensions);
    const hasExpectedExt = this.hasExpectedExtensions(extensions, rule);
    if (hasExpectedExt) {
      score += extWeight;
    }
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Check if extensions match expected patterns
   */
  private hasExpectedExtensions(extensions: string[], rule: DetectionRule): boolean {
    const extSet = new Set(extensions.map(e => e.toLowerCase()));
    
    // Check for common extension patterns in file patterns
    if (rule.filePatterns.some(p => p.includes('.dart'))) {
      return extSet.has('.dart');
    }
    if (rule.filePatterns.some(p => p.includes('.ts') || p.includes('.js'))) {
      return extSet.has('.ts') || extSet.has('.js') || extSet.has('.tsx') || extSet.has('.jsx');
    }
    
    return true; // No specific extension requirement
  }

  /**
   * Get all file names from a file tree
   */
  private getAllFileNames(node: FileNode): string[] {
    const names: string[] = [];
    
    if (!node.isDirectory) {
      names.push(node.name);
      return names;
    }
    
    if (node.children) {
      for (const child of node.children) {
        names.push(...this.getAllFileNames(child));
      }
    }
    
    return names;
  }

  /**
   * Create architecture pattern from rule and structure
   */
  private createPattern(rule: DetectionRule, structure: ScannedStructure, confidence: number): ArchitecturePattern {
    const layers = this.extractLayerInfo(structure);
    
    return {
      name: rule.name,
      description: this.generateDescription(rule.name, structure),
      confidence,
      layers
    };
  }

  /**
   * Create a generic pattern for unknown architectures
   */
  private createGenericPattern(structure: ScannedStructure): ArchitecturePattern {
    const layers = this.extractLayerInfo(structure);
    
    return {
      name: 'Custom Architecture',
      description: this.generateDescription('Custom', structure),
      confidence: 50,
      layers
    };
  }

  /**
   * Extract layer information from structure
   */
  private extractLayerInfo(structure: ScannedStructure): LayerInfo[] {
    const layers: LayerInfo[] = [];
    
    if (!structure.fileTree.children) {
      return layers;
    }

    for (const child of structure.fileTree.children) {
      if (child.isDirectory) {
        const fileCount = countNodes(child).files;
        const fileTypes = this.getFileTypes(child);
        
        layers.push({
          name: child.name,
          path: child.path,
          fileCount,
          fileTypes
        });
      }
    }
    
    return layers;
  }

  /**
   * Get unique file types in a node
   */
  private getFileTypes(node: FileNode): string[] {
    const types = new Set<string>();
    
    const collectTypes = (n: FileNode) => {
      if (!n.isDirectory) {
        // Extract file type from name (e.g., "user_model.dart" -> "model")
        const nameParts = n.name.replace(/\.[^.]+$/, '').split(/[_.-]/);
        if (nameParts.length > 1) {
          types.add(nameParts[nameParts.length - 1]);
        }
      } else if (n.children) {
        n.children.forEach(collectTypes);
      }
    };
    
    collectTypes(node);
    return Array.from(types);
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(patternName: string, structure: ScannedStructure): string {
    const { totalFiles, totalDirectories, layers } = structure;
    
    const parts: string[] = [];
    parts.push(`${patternName} Architecture`);
    
    if (layers.length > 0) {
      parts.push(`${layers.length} layers (${layers.join(', ')})`);
    }
    
    parts.push(`${totalFiles} files`);
    
    return parts.join(' - ');
  }

  /**
   * Format pattern for display
   */
  formatPattern(pattern: ArchitecturePattern, structure: ScannedStructure): string {
    const lines: string[] = [];
    
    lines.push(`Architecture: ${pattern.name}`);
    lines.push(`Confidence: ${pattern.confidence}%`);
    lines.push(`Description: ${pattern.description}`);
    lines.push('');
    lines.push('Structure:');
    
    for (const layer of pattern.layers) {
      const types = layer.fileTypes.length > 0 ? layer.fileTypes.join(', ') : 'various';
      lines.push(`  ${layer.name}/ (${layer.fileCount} files: ${types})`);
    }
    
    return lines.join('\n');
  }
}

