# Feature Cloner Extension - Project Summary

## Overview

The Feature Cloner is a VSCode extension that intelligently clones feature folder structures with automatic architecture detection and smart content replacement. It eliminates the need for manual folder creation and name replacements when scaffolding new features.

## Key Features

✨ **Auto-Detection**: Automatically detects architecture patterns (Riverpod, MVC, MVVM, etc.)
🎯 **Smart File Filtering**: Only clones files containing the feature name, skipping unrelated files
📁 **Structure Preservation**: Maintains complete folder hierarchy (even empty folders)
🔄 **Universal Support**: Works with any programming language and architecture
📝 **Content Updates**: Automatically updates class names, imports, and references
💬 **Interactive UI**: QuickPick dialogs with pre-selected actions (press Enter to proceed)
🚀 **Easy to Use**: Simple right-click context menu integration

## Project Structure

```
vscode-feature-cloner/
├── src/
│   ├── extension.ts                    # Main extension entry point
│   ├── commands/
│   │   └── cloneFeatureCommand.ts     # Command orchestration
│   ├── scanner/
│   │   ├── structureScanner.ts        # Folder structure scanning
│   │   ├── patternAnalyzer.ts         # Architecture pattern detection
│   │   └── architectureTypes.ts       # Pattern definitions
│   ├── cloner/
│   │   ├── smartCloner.ts             # Cloning logic
│   │   └── contentReplacer.ts         # Name replacement engine
│   └── utils/
│       ├── fileSystem.ts              # File operations
│       └── naming.ts                  # Case conversion utilities
├── test-examples/
│   ├── flutter-riverpod/              # Flutter test example
│   └── nodejs-mvc/                    # Node.js test example
├── package.json                        # Extension manifest
├── tsconfig.json                       # TypeScript config
├── build.js                           # Build script (esbuild)
└── Documentation files
```

## Core Components

### 1. Extension Entry Point (`extension.ts`)
- Registers the `extension.cloneFeature` command
- Handles extension activation and deactivation
- Sets up VSCode integration

### 2. Command Handler (`cloneFeatureCommand.ts`)
- Orchestrates the entire cloning workflow
- Shows interactive QuickPick dialogs with pre-selected actions
- Handles user input and confirmations
- Displays progress notifications at appropriate stages
- Separates user interactions from progress indicators for better UX

### 3. Structure Scanner (`structureScanner.ts`)
- Recursively scans folder trees
- Extracts feature name and structure information
- Generates tree visualizations

### 4. Pattern Analyzer (`patternAnalyzer.ts`)
- Detects architecture patterns from folder structure
- Calculates confidence scores
- Supports 7+ common patterns (Riverpod, MVC, MVVM, etc.)
- Falls back to "Custom Architecture" for unknown patterns

### 5. Smart Cloner (`smartCloner.ts`)
- Creates new folder structure matching source (preserves all folders)
- Filters files based on feature name presence in filename
- Orchestrates file copying and name replacement
- Provides preview functionality
- Handles errors gracefully
- Skips files without feature name to avoid copying unrelated code

### 6. Content Replacer (`contentReplacer.ts`)
- Intelligently replaces feature names in file content
- Supports multiple case styles (PascalCase, camelCase, snake_case, kebab-case, UPPER_CASE)
- Updates imports and references automatically
- Handles partial name matches

### 7. Utilities
- **fileSystem.ts**: File operations (scan, read, write, create directories)
- **naming.ts**: Case conversions and name transformations

## Workflow

```
1. User right-clicks feature folder
        ↓
2. Progress: Scan & analyze structure
        ↓
3. QuickPick: Show architecture detection
   (Pre-selected "Continue" - press Enter)
        ↓
4. InputBox: Enter new feature name
   (With validation)
        ↓
5. QuickPick: Preview all files to be created
   (Pre-selected "Create" - press Enter)
        ↓
6. Progress: Clone files with smart filtering
   (Only files with feature name)
        ↓
7. Success: Show message with "Open Folder" option
```

### User Experience Highlights

- **Progress indicators** only during background operations (scanning, cloning)
- **Interactive dialogs** for all user decisions (outside progress)
- **Pre-selected actions** for quick keyboard workflow (just press Enter)
- **Scrollable previews** to review all changes before confirming
- **Smart filtering** automatically skips unrelated files

## Supported Architecture Patterns

| Pattern | Detection Criteria | Example Folders |
|---------|-------------------|-----------------|
| Flutter Riverpod | data, domain, presentation, providers | Clean Architecture + State Management |
| Clean Architecture | data, domain, presentation | Layered architecture |
| MVC | models, views, controllers | Classic MVC |
| MVVM | models, views, viewmodels | Model-View-ViewModel |
| MVC Express | models, routes, controllers | Node.js + Express |
| React Feature | components, hooks, utils | Component-based |
| Vertical Slice | api, services, components | Feature slicing |
| Custom | Any structure | Anything else |

## Smart File Filtering

The extension intelligently filters files during cloning:

### Files That Are Cloned
✅ Files containing the feature name in their filename
- `user_auth_service.ts` ✅
- `UserAuthController.dart` ✅
- `user-auth-model.js` ✅

### Files That Are Skipped
❌ Files without the feature name
- `config.json` ❌ (no feature name)
- `index.ts` ❌ (no feature name)
- `helper.dart` ❌ (no feature name)

### Folder Structure
📁 All folders are preserved (even if empty after filtering)
- Maintains consistent architecture
- Ready for users to add new files
- Clear visual structure

## Name Replacement Intelligence

The extension handles multiple case styles:

**Input:** `product_barcode` → `user_profile`

**Replacements in Files:**
- `ProductBarcode` → `UserProfile` (PascalCase)
- `productBarcode` → `userProfile` (camelCase)
- `product_barcode` → `user_profile` (snake_case)
- `product-barcode` → `user-profile` (kebab-case)
- `PRODUCT_BARCODE` → `USER_PROFILE` (UPPER_CASE)

**Example Transformation:**
```dart
// Before: product_barcode_model.dart
class ProductBarcodeModel {
  final ProductBarcodeInfo info;
}
import '../data/model/product_barcode_model.dart';

// After: user_profile_model.dart
class UserProfileModel {
  final UserProfileInfo info;
}
import '../data/model/user_profile_model.dart';
```

## Documentation

- **README.md** - Main overview and features
- **QUICKSTART.md** - Get started in 5 minutes
- **INSTALLATION.md** - Detailed installation and development setup
- **USAGE_EXAMPLES.md** - Real-world usage examples
- **TESTING.md** - Comprehensive testing guide
- **PROJECT_SUMMARY.md** - This file

## Test Examples

### Flutter Riverpod Example
Location: `test-examples/flutter-riverpod/product_barcode/`

A complete Flutter feature with:
- Data layer (models, repository implementations)
- Domain layer (repository interfaces)
- Presentation layer (screens)
- Providers (Riverpod state management)

### Node.js MVC Example
Location: `test-examples/nodejs-mvc/user_auth/`

A Node.js feature with:
- Models (Mongoose)
- Controllers (Express)
- Routes (Express)

## Installation & Usage

### Quick Start

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Run in development
code .
# Press F5

# Package for distribution
npm run package
```

### Usage

1. Right-click any feature folder
2. Select "Clone Feature Structure"
3. Review detected architecture
4. Enter new feature name
5. Confirm and create!

## Technical Details

### Dependencies
- **vscode**: ^1.75.0 (VSCode API)
- **typescript**: ^5.0.0
- **esbuild**: ^0.19.0 (Fast bundler)

### Build Process
- TypeScript compiled to JavaScript
- Bundled with esbuild for fast compilation
- Output: `dist/extension.js`

### Performance
- Handles folders with 100+ files efficiently
- Progress indication for long operations
- Asynchronous operations throughout
- No blocking of VSCode UI

## Extensibility

The architecture is designed for easy extension:

1. **Add New Patterns**: Update `architectureTypes.ts` with new detection rules
2. **Custom Replacement Logic**: Extend `contentReplacer.ts`
3. **Additional File Operations**: Extend `fileSystem.ts`
4. **New Case Styles**: Add to `naming.ts`

## Future Enhancements

Potential features to add:
- [ ] Configuration file support (.featurecloner.json)
- [ ] Template customization
- [ ] Batch cloning multiple features
- [ ] Git integration (auto-commit)
- [ ] Undo functionality
- [ ] Snippet generation
- [ ] AI-powered pattern detection
- [ ] Remote template repositories
- [ ] Team-shared templates
- [ ] Analytics and usage tracking

## Known Limitations

1. **File filtering**: Only files with the feature name in their filename are cloned (by design)
2. **Absolute imports**: May not be updated correctly - prefer relative imports
3. **Short feature names**: Very short names (1-2 chars) may cause over-replacement
4. **Binary files**: Not processed (only text files are cloned)
5. **Permissions**: Requires write permissions in target directory

## Best Practices

1. **Include feature name in filenames** - Ensures files are cloned correctly
   - ✅ `user_auth_service.ts`
   - ❌ `service.ts` (too generic, will be skipped)

2. **Use consistent naming** - Apply feature name across all related files
   - ✅ `UserAuthController`, `user_auth_model`, `UserAuthService`

3. **Prefer relative imports** - Better path replacement
   - ✅ `import '../models/user_auth_model'`
   - ❌ `import '@/features/user_auth/models/user_auth_model'`

4. **Keep features self-contained** - All feature code in one folder

5. **Use descriptive names** - At least 3 characters, meaningful names

6. **Review before confirming** - Check the preview list before creating

7. **Test cloned features** - Run tests after cloning

8. **Review git diff** - Check what changed after cloning

## Contributing

Contributions welcome! Areas to improve:
- Additional architecture pattern support
- Better detection algorithms
- UI/UX enhancements
- Performance optimizations
- Documentation improvements
- Test coverage

## License

MIT License - Feel free to use and modify!

## Credits

Built with ❤️ for developers who value efficiency and consistency in their codebases.

---

**Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** ✅ Production Ready

