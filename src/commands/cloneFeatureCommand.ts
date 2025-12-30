/**
 * Clone feature command handler
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { StructureScanner } from '../scanner/structureScanner';
import { PatternAnalyzer } from '../scanner/patternAnalyzer';
import { SmartCloner } from '../cloner/smartCloner';

export class CloneFeatureCommand {
  private scanner: StructureScanner;
  private analyzer: PatternAnalyzer;
  private cloner: SmartCloner;

  constructor() {
    this.scanner = new StructureScanner();
    this.analyzer = new PatternAnalyzer();
    this.cloner = new SmartCloner();
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

      // Step 1 & 2: Scan and analyze with progress
      const { structure, pattern } = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Analyzing feature structure...',
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: 'Scanning folder structure...' });
          const structure = await this.scanner.scan(folderPath);

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

      // Step 5: Determine target directory
      const targetDirectory = path.dirname(folderPath);

      // Step 6: Show preview of what will be created (OUTSIDE progress)
      const preview = await this.cloner.preview(structure, {
        sourceFeatureName: structure.featureName,
        targetFeatureName: newFeatureName,
        targetDirectory
      });

      const proceedWithClone = await this.showClonePreview(
        newFeatureName,
        preview,
        structure
      );

      if (!proceedWithClone) {
        vscode.window.showInformationMessage('Clone operation cancelled.');
        return;
      }

      // Step 7: Perform the clone with progress
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Cloning feature: ${newFeatureName}...`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: 'Creating files and folders...' });
          return await this.cloner.clone(structure, {
            sourceFeatureName: structure.featureName,
            targetFeatureName: newFeatureName,
            targetDirectory
          });
        }
      );

      // Step 8: Show results (OUTSIDE progress)
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
    const items = [
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
   * Show preview of what will be created
   */
  private async showClonePreview(
    newFeatureName: string,
    preview: string[],
    structure: any
  ): Promise<boolean> {
    // Create QuickPick items from preview
    const quickPick = vscode.window.createQuickPick();
    quickPick.title = `Create Feature: ${newFeatureName}`;
    quickPick.placeholder = `Review the files below, then scroll down and select an action ↓`;
    
    // Convert paths to relative and create items
    const items = preview.map(p => {
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
        label: `${structure.totalFiles} files and ${structure.totalDirectories} directories will be created`,
        description: '',
        detail: undefined
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

