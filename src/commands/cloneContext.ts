import { CloneOptions, CloneScopeMode } from '../cloner/smartCloner';
import { ArchitecturePattern } from '../scanner/architectureTypes';
import { ScannedStructure } from '../scanner/structureScanner';

export interface CloneScopeSelection {
  scopeMode: CloneScopeMode;
  selectedSubfolders?: string[];
}

export interface CloneContext {
  structure: ScannedStructure;
  pattern: ArchitecturePattern;
  sourceFolderPath: string;
  targetDirectory: string;
  targetFeatureName: string;
  cloneScope: CloneScopeSelection;
}

export type StackCloneOptions = Partial<CloneOptions>;

