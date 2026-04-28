/**
 * Clone feature command handler
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { StructureScanner } from '../scanner/structureScanner';
import { PatternAnalyzer } from '../scanner/patternAnalyzer';
import { SmartCloner, CloneOptions, CloneScopeMode } from '../cloner/smartCloner';
import { CloneContext, CloneScopeSelection, StackCloneOptions } from './cloneContext';
import { CloneHandler } from './handlers/cloneHandler';
import { DefaultCloneHandler } from './handlers/defaultCloneHandler';
import { NodeCloneHandler } from './handlers/nodeCloneHandler';

export class CloneFeatureCommand {
  private scanner: StructureScanner;
  private analyzer: PatternAnalyzer;
  private cloner: SmartCloner;
  private handlers: CloneHandler[];
  private readonly knownSubfolderNames = new Set([
    'provider',
    'providers',
    'presentation',
    'domain',
    'data',
    'model',
    'models',
    'view',
    'views',
    'viewmodel',
    'viewmodels',
    'controller',
    'controllers',
    'service',
    'services',
    'repository',
    'repositories',
    'hook',
    'hooks',
    'component',
    'components',
    'route',
    'routes',
    'screen',
    'screens',
    'bloc',
    'blocs',
    'cubit',
    'cubits',
    'notifier',
    'notifiers',
    'state',
    'states',
    'utils',
    'helper',
    'helpers',
    'api',
    'apis',
    'store',
    'stores',
    'slice',
    'slices',
    'context',
    'contexts',
    'type',
    'types',
    'interface',
    'interfaces',
    'page',
    'pages',
    'layout',
    'layouts',
    'lib',
    'middleware',
    'middlewares',
    'action',
    'actions',
    'reducer',
    'reducers',
    'saga',
    'sagas',
    'selector',
    'selectors',
    'test',
    'tests',
    '__tests__',
    'spec',
    'specs'
  ]);

  constructor() {
    this.scanner = new StructureScanner();
    this.analyzer = new PatternAnalyzer();
    this.cloner = new SmartCloner();
    this.handlers = [
      new NodeCloneHandler(),
      new DefaultCloneHandler()
    ];
  }

  /**
   * Execute the clone feature command
   */
  async execute(uri?: vscode.Uri): Promise<void> {
    try {
      // Get the selected folder
      const folderPath = await this.getSelectedFolder(uri);
      if (!folderPath) {
        return;
      }

      // Resolve whether user selected a feature root or a subfolder inside a feature
      const selectionContext = await this.resolveSelectionContext(folderPath);

      // Step 1 & 2: Scan and analyze with progress
      const { structure, pattern } = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Analyzing feature structure...',
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: 'Scanning folder structure...' });
          const structure = await this.scanner.scan(selectionContext.sourceFolderPath);

          progress.report({ message: 'Detecting architecture pattern...' });
          const pattern = this.analyzer.analyze(structure);

          return { structure, pattern };
        }
      );

      // Step 3: Show detection results and get confirmation (OUTSIDE progress)
      const confirmed = await this.showPatternConfirmation(pattern, structure);
      if (!confirmed) {
        vscode.window.showInformationMessage('Clone operation cancelled.');
        return;
      }

      // Step 4: Get new feature name (OUTSIDE progress)
      const newFeatureName = await this.getNewFeatureName(structure.featureName);
      if (!newFeatureName) {
        vscode.window.showInformationMessage('Clone operation cancelled.');
        return;
      }

      // Step 5: Select clone scope (full feature or specific subfolder(s))
      const cloneScope = selectionContext.forcedSubfolderName
        ? {
            scopeMode: 'subfolders' as CloneScopeMode,
            selectedSubfolders: [selectionContext.forcedSubfolderName]
          }
        : await this.getCloneScope(structure);
      if (!cloneScope) {
        vscode.window.showInformationMessage('Clone operation cancelled.');
        return;
      }

      // Step 6: Determine target directory
      const targetDirectory = path.dirname(selectionContext.sourceFolderPath);
      const handlerContext: CloneContext = {
        structure,
        pattern,
        sourceFolderPath: selectionContext.sourceFolderPath,
        targetDirectory,
        targetFeatureName: newFeatureName,
        cloneScope
      };
      const stackOptions = await this.collectStackCloneOptions(handlerContext);
      if (!stackOptions) {
        vscode.window.showInformationMessage('Clone operation cancelled.');
        return;
      }

      const cloneOptions: CloneOptions = {
        sourceFeatureName: structure.featureName,
        targetFeatureName: newFeatureName,
        targetDirectory,
        scopeMode: cloneScope.scopeMode,
        selectedSubfolders: cloneScope.selectedSubfolders,
        ...stackOptions
      };

      // Step 7: Build preview paths once (used for conflict checks and UI preview)
      const preview = await this.cloner.preview(structure, cloneOptions);

      const targetFeaturePath = path.join(targetDirectory, newFeatureName);
      const isSubfolderClone = cloneOptions.scopeMode === 'subfolders' || (cloneOptions.selectedSubfolders?.length ?? 0) > 0;
      if (isSubfolderClone && await this.pathExists(targetFeaturePath)) {
        const selected = (cloneOptions.selectedSubfolders ?? []).join(', ');
        const conflicts = await this.getExistingFileConflicts(preview);
        const conflictDetails = this.buildConflictSummary(conflicts, targetFeaturePath);
        const action = await vscode.window.showWarningMessage(
          `Feature "${newFeatureName}" already exists. Merge cloned subfolder(s) (${selected}) into it?\n\n${conflictDetails}`,
          { modal: true },
          'Merge',
          'Cancel'
        );

        if (action !== 'Merge') {
          vscode.window.showInformationMessage('Clone operation cancelled.');
          return;
        }

        cloneOptions.allowMergeIntoExistingRoot = true;
      }

      // Step 8: Show preview of what will be created (OUTSIDE progress)

      const proceedWithClone = await this.showClonePreview(
        newFeatureName,
        preview,
        cloneOptions
      );

      if (!proceedWithClone) {
        vscode.window.showInformationMessage('Clone operation cancelled.');
        return;
      }

      // Step 9: Perform the clone with progress
      let result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Cloning feature: ${newFeatureName}...`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: 'Creating files and folders...' });
          return await this.cloner.clone(structure, cloneOptions);
        }
      );

      // Defensive fallback: if pre-check missed, offer merge and retry once.
      if (
        !result.success &&
        this.hasTargetAlreadyExistsError(result.errors) &&
        !cloneOptions.allowMergeIntoExistingRoot
      ) {
        const conflicts = await this.getExistingFileConflicts(preview);
        const conflictDetails = this.buildConflictSummary(conflicts, targetFeaturePath);
        const retryAction = await vscode.window.showWarningMessage(
          `Feature "${newFeatureName}" already exists. Merge and retry?\n\n${conflictDetails}`,
          { modal: true },
          'Merge and Retry',
          'Cancel'
        );

        if (retryAction === 'Merge and Retry') {
          cloneOptions.allowMergeIntoExistingRoot = true;
          result = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Merging into feature: ${newFeatureName}...`,
              cancellable: false
            },
            async (progress) => {
              progress.report({ message: 'Merging files and folders...' });
              return await this.cloner.clone(structure, cloneOptions);
            }
          );
        }
      }

      // Step 10: Show results (OUTSIDE progress)
      if (result.success) {
        const message = `Successfully created feature "${newFeatureName}" with ${result.filesCreated} files in ${result.directoriesCreated} directories.`;
        const openFolder = 'Open Folder';
        const action = await vscode.window.showInformationMessage(message, openFolder);
        
        if (action === openFolder) {
          const newFeaturePath = path.join(targetDirectory, newFeatureName);
          const newFeatureUri = vscode.Uri.file(newFeaturePath);
          await vscode.commands.executeCommand('revealInExplorer', newFeatureUri);
        }
      } else {
        const errors = result.errors.join('\n');
        vscode.window.showErrorMessage(`Clone failed:\n${errors}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error cloning feature: ${error}`);
    }
  }

  /**
   * Resolve whether the selected path is a feature root or a known feature subfolder.
   */
  private async resolveSelectionContext(
    selectedFolderPath: string
  ): Promise<{ sourceFolderPath: string; forcedSubfolderName?: string }> {
    const selectedFolderName = path.basename(selectedFolderPath).toLowerCase();
    if (!this.knownSubfolderNames.has(selectedFolderName)) {
      return { sourceFolderPath: selectedFolderPath };
    }

    const parentPath = path.dirname(selectedFolderPath);
    if (parentPath === selectedFolderPath) {
      return { sourceFolderPath: selectedFolderPath };
    }

    try {
      const siblings = await fs.promises.readdir(parentPath, { withFileTypes: true });
      const siblingDirNames = siblings
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name.toLowerCase());

      const knownSiblingCount = siblingDirNames.filter(name => this.knownSubfolderNames.has(name)).length;
      if (knownSiblingCount >= 2) {
        return {
          sourceFolderPath: parentPath,
          forcedSubfolderName: path.basename(selectedFolderPath)
        };
      }
    } catch {
      // Fall back to selected folder if parent can't be inspected
    }

    return { sourceFolderPath: selectedFolderPath };
  }

  /**
   * Check if a path already exists.
   */
  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Return existing file paths that would be overwritten by clone output.
   */
  private async getExistingFileConflicts(targetPaths: string[]): Promise<string[]> {
    const checks = await Promise.all(
      targetPaths.map(async (targetPath) => {
        try {
          const stat = await fs.promises.stat(targetPath);
          return stat.isFile() ? targetPath : undefined;
        } catch {
          return undefined;
        }
      })
    );

    return checks.filter((value): value is string => typeof value === 'string');
  }

  /**
   * Build human-readable conflict summary for merge confirmation.
   */
  private buildConflictSummary(conflicts: string[], targetFeaturePath: string): string {
    if (conflicts.length === 0) {
      return 'No existing file conflicts detected. New files and folders will be merged into the existing feature.';
    }

    const previewLimit = 5;
    const listed = conflicts.slice(0, previewLimit).map(conflictPath => {
      const relativePath = path.relative(targetFeaturePath, conflictPath);
      return `- ${relativePath}`;
    });

    const remaining = conflicts.length - listed.length;
    if (remaining > 0) {
      listed.push(`- ...and ${remaining} more file(s)`);
    }

    return `Detected ${conflicts.length} existing file(s) that will be overwritten:\n${listed.join('\n')}`;
  }

  /**
   * Identify target-exists guard errors from cloner result.
   */
  private hasTargetAlreadyExistsError(errors: string[]): boolean {
    return errors.some(error => error.toLowerCase().includes('target directory already exists'));
  }

  /**
   * Collect stack-specific clone options from the first matching handler.
   */
  private async collectStackCloneOptions(context: CloneContext): Promise<StackCloneOptions | undefined> {
    for (const handler of this.handlers) {
      if (await handler.canHandle(context)) {
        return await handler.collectOptions(context);
      }
    }

    return {};
  }

  /**
   * Get the selected folder path
   */
  private async getSelectedFolder(uri?: vscode.Uri): Promise<string | undefined> {
    if (uri) {
      return uri.fsPath;
    }

    // No URI provided, ask user to select a folder
    const options: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: 'Select feature folder to clone'
    };

    const result = await vscode.window.showOpenDialog(options);
    if (result && result.length > 0) {
      return result[0].fsPath;
    }

    return undefined;
  }

  /**
   * Show pattern detection results and get confirmation
   */
  private async showPatternConfirmation(
    pattern: any,
    structure: any
  ): Promise<boolean> {
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = `Detected: ${pattern.name} (${pattern.confidence}% confidence)`;
    quickPick.placeholder = 'Review the architecture below, then scroll down and select an action ↓';
    
    // Create items showing the structure
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(info) Architecture Details',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: `$(symbol-structure) ${pattern.name}`,
        description: `${pattern.confidence}% confidence`,
        detail: pattern.description
      },
      {
        label: '$(folder) Structure Overview',
        kind: vscode.QuickPickItemKind.Separator
      }
    ];

    // Add layer information
    for (const layer of pattern.layers) {
      const fileTypes = layer.fileTypes.length > 0 ? layer.fileTypes.join(', ') : 'various';
      items.push({
        label: `📁 ${layer.name}/`,
        description: `${layer.fileCount} files`,
        detail: `File types: ${fileTypes}`
      });
    }

    items.push(
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: '$(pulse) Summary',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: `Total: ${structure.totalFiles} files in ${structure.totalDirectories} directories`,
        description: 'will be cloned',
        detail: 'Complete feature structure will be replicated'
      },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: '$(rocket) Next Step',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: '✓ Continue',
        description: '← Press Enter or click here',
        detail: 'Proceed to choose a new feature name',
        alwaysShow: true
      },
      {
        label: '✗ Cancel',
        description: '← Press Escape or click here',
        detail: 'Cancel the cloning operation',
        alwaysShow: true
      }
    );

    quickPick.items = items;
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;
    
    // Pre-select the Continue option
    const continueItem = items.find(item => item.label === '✓ Continue');
    if (continueItem) {
      quickPick.activeItems = [continueItem];
    }

    return new Promise<boolean>((resolve) => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0] || quickPick.activeItems[0];
        if (selected?.label === '✓ Continue') {
          quickPick.hide();
          resolve(true);
        } else if (selected?.label === '✗ Cancel') {
          quickPick.hide();
          resolve(false);
        }
      });

      quickPick.onDidHide(() => {
        quickPick.dispose();
        resolve(false);
      });

      quickPick.show();
    });
  }

  /**
   * Get new feature name from user
   */
  private async getNewFeatureName(currentName: string): Promise<string | undefined> {
    const newName = await vscode.window.showInputBox({
      prompt: 'Enter the new feature name',
      placeHolder: 'e.g., user_profile, order_management',
      value: '',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Feature name cannot be empty';
        }
        if (value === currentName) {
          return 'New name must be different from current name';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
          return 'Feature name must start with a letter and contain only letters, numbers, underscores, or hyphens';
        }
        return null;
      }
    });

    return newName?.trim();
  }

  /**
   * Let user choose full clone or specific subfolder(s)
   */
  private async getCloneScope(
    structure: any
  ): Promise<CloneScopeSelection | undefined> {
    const scopeItems: Array<vscode.QuickPickItem & { scopeMode: CloneScopeMode }> = [
      {
        label: 'Clone full feature',
        description: 'Copy all matching files and folders',
        scopeMode: 'full'
      },
      {
        label: 'Clone specific subfolder(s)',
        description: 'Choose one or more top-level folders only',
        scopeMode: 'subfolders'
      }
    ];

    const scopeSelection = await vscode.window.showQuickPick(
      scopeItems,
      {
        title: 'Choose clone scope',
        placeHolder: 'Select how much of the feature to clone',
        canPickMany: false,
        ignoreFocusOut: true
      }
    );

    if (!scopeSelection) {
      return undefined;
    }

    if (scopeSelection.scopeMode === 'full') {
      return { scopeMode: 'full' };
    }

    const availableSubfolders = (structure.layers ?? []).filter((layer: string) => layer.trim().length > 0);
    if (availableSubfolders.length === 0) {
      vscode.window.showWarningMessage('No top-level subfolders found. Falling back to full clone.');
      return { scopeMode: 'full' };
    }

    const subfolderItems: vscode.QuickPickItem[] = availableSubfolders.map((layer: string) => ({
      label: layer,
      description: `Clone only ${layer}/ into ${structure.featureName}`
    }));

    const selectedSubfolders = await vscode.window.showQuickPick(
      subfolderItems,
      {
        title: 'Select subfolder(s) to clone',
        placeHolder: 'Choose one or more top-level folders',
        canPickMany: true,
        ignoreFocusOut: true
      }
    );

    if (!selectedSubfolders || selectedSubfolders.length === 0) {
      return undefined;
    }

    return {
      scopeMode: 'subfolders',
      selectedSubfolders: selectedSubfolders.map(item => item.label)
    };
  }

  /**
   * Show preview of what will be created
   */
  private async showClonePreview(
    newFeatureName: string,
    preview: string[],
    cloneOptions: CloneOptions
  ): Promise<boolean> {
    const scopedFileCount = preview.filter(p => path.extname(p).length > 0).length;
    const scopedDirectoryCount = Math.max(preview.length - scopedFileCount, 0);
    const scopeDetail = cloneOptions.scopeMode === 'subfolders'
      ? `Subfolders: ${(cloneOptions.selectedSubfolders ?? []).join(', ')}`
      : 'Scope: full feature';

    // Create QuickPick items from preview
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = `Create Feature: ${newFeatureName}`;
    quickPick.placeholder = `Review the files below, then scroll down and select an action ↓`;
    
    // Convert paths to relative and create items
    const items: vscode.QuickPickItem[] = preview.map((p): vscode.QuickPickItem => {
      const relativePath = p.replace(/^.*\/test-examples\/[^/]+\//, '');
      const isDirectory = !relativePath.includes('.') || relativePath.endsWith('/');
      return {
        label: isDirectory ? `📁 ${relativePath}` : `📄 ${relativePath}`,
        description: isDirectory ? 'folder' : 'file',
        detail: undefined // Remove the full path for cleaner view
      };
    });
    
    // Add separator and action buttons at the bottom
    items.push(
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: '$(info) Summary',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: `${scopedFileCount} files and ${scopedDirectoryCount} directories will be created`,
        description: '',
        detail: scopeDetail
      },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: '$(rocket) Create Feature',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: '✓ Yes, Create Feature',
        description: '← Press Enter or click here',
        detail: `Create "${newFeatureName}" with all files and folders shown above`,
        alwaysShow: true
      },
      {
        label: '✗ Cancel',
        description: '← Press Escape or click here',
        detail: 'Cancel the operation and don\'t create anything',
        alwaysShow: true
      }
    );
    
    quickPick.items = items;
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;
    
    // Pre-select the Create option
    const createItem = items.find(item => item.label === '✓ Yes, Create Feature');
    if (createItem) {
      quickPick.activeItems = [createItem];
    }

    return new Promise<boolean>((resolve) => {
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0] || quickPick.activeItems[0];
        if (selected?.label === '✓ Yes, Create Feature') {
          quickPick.hide();
          resolve(true);
        } else if (selected?.label === '✗ Cancel') {
          quickPick.hide();
          resolve(false);
        }
      });

      quickPick.onDidHide(() => {
        quickPick.dispose();
        resolve(false);
      });

      quickPick.show();
    });
  }
}

