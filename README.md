# Feature Cloner - VSCode Extension

Intelligently clone feature folder structures with automatic architecture detection and smart file filtering.

## Features

- **Auto-Detection**: Automatically detects architecture patterns from existing code
- **Smart File Filtering**: Only clones files that contain the feature name, skipping unrelated files
- **Structure Preservation**: Maintains folder hierarchy (even empty folders) for consistency
- **Intelligent Replacement**: Updates class names, imports, and references with proper case handling
- **Universal Support**: Works with any architecture (Flutter, React, Node.js, Android, etc.)
- **Quick & Easy**: Simple right-click context menu integration
- **Interactive Preview**: Review all changes before creating files

## Quick Start

1. **Right-click** on any feature folder in the Explorer
2. Select **"Clone Feature Structure"**
3. **Review** the detected architecture (press Enter to continue)
4. **Enter** the new feature name
5. **Choose** clone scope (full feature or specific subfolder(s))
6. **Review** the files to be created (press Enter to confirm)
7. **Done!** Your new feature is ready

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and version updates.

## How It Works

The extension intelligently handles your code:

1. Scans the selected folder structure
2. Detects the architecture pattern (Riverpod, MVC, MVVM, etc.) with confidence scoring
3. Filters files - only copies files containing the feature name (with smart singular/plural matching)
4. Preserves all folders for consistency (even if some become empty)
5. Replaces names in all case styles (PascalCase, camelCase, snake_case, kebab-case)
6. Updates file contents, imports, class names, and references automatically

### Smart File Filtering

Only files with the feature name in their filename are cloned:

**Example:** Cloning `user_auth` to `product_catalog`
- `UserAuthService.ts` → `ProductCatalogService.ts` (copied & renamed)
- `user_auth_model.dart` → `product_catalog_model.dart` (copied & renamed)
- `config.json` (skipped - no feature name)
- `index.ts` (skipped - no feature name)

Folder structure is preserved, so you can add new files later!

## Supported Architectures

- **Flutter Riverpod** (data/domain/presentation/providers)
- **MVC** (models/views/controllers)
- **MVVM** (models/views/viewmodels)
- **Clean Architecture** (layered structure)
- **Node.js/Express** (MVC pattern)
- **React Features** (components/hooks/utils)
- **Custom Patterns** (automatically detected)

## Requirements

- VSCode 1.75.0 or higher
- No additional dependencies needed!

## Installation

### From VSIX File
1. Download the `.vsix` file
2. Open VSCode
3. Go to Extensions (Ctrl+Shift+X)
4. Click "..." menu → "Install from VSIX"
5. Select the downloaded file

### From Source
```bash
git clone <repository-url>
cd vscode-feature-cloner
npm install
npm run compile
code --install-extension feature-cloner-1.0.0.vsix
```

## Example

**Clone `product_barcode` to `user_profile`:**

```
product_barcode/                  →  user_profile/
├── data/                         →  ├── data/
│   └── barcode_model.dart       →  │   └── profile_model.dart
├── controllers/                  →  ├── controllers/
│   └── barcode_controller.ts    →  │   └── profile_controller.ts
└── utils/                        →  └── utils/
    └── config.json              →      (empty - file skipped)
```

**Content Changes:**
- `BarcodeModel` → `ProfileModel`
- `product_barcode` → `user_profile`
- `ProductBarcode` → `UserProfile`
- Imports automatically updated

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

MIT License - See LICENSE file for details

## Support

If you find this extension helpful, please consider:
- Starring the repository
- Reporting bugs or suggesting features
- Sharing with your team

---

**Made for developers who value efficiency and consistency**

