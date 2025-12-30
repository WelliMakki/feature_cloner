/**
 * VSCode Feature Cloner Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { CloneFeatureCommand } from './commands/cloneFeatureCommand';

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Feature Cloner extension is now active');

  // Create command handler
  const cloneCommand = new CloneFeatureCommand();

  // Register the clone feature command
  const disposable = vscode.commands.registerCommand(
    'extension.cloneFeature',
    (uri?: vscode.Uri) => cloneCommand.execute(uri)
  );

  context.subscriptions.push(disposable);
}

/**
 * Extension deactivation
 */
export function deactivate() {
  console.log('Feature Cloner extension is now deactivated');
}

