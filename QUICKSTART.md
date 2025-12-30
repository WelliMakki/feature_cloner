# Quick Start Guide

Get started with the Feature Cloner extension in 5 minutes!

## Installation

### Option 1: Development Mode

```bash
# Navigate to the extension directory
cd vscode-feature-cloner

# Install dependencies
npm install

# Compile the extension
npm run compile

# Open in VSCode
code .

# Press F5 to run in development mode
```

### Option 2: Install as Extension

```bash
# Package the extension
npm run package

# Install the .vsix file
code --install-extension feature-cloner-1.0.0.vsix
```

## Basic Usage

### 1. Quick Test with Provided Examples

The extension comes with test examples in `test-examples/`:

1. Open VSCode with the extension loaded (F5 in development)
2. Open the `test-examples` folder
3. Right-click on `flutter-riverpod/product_barcode`
4. Select **"Clone Feature Structure"**
5. **Review the architecture detection** (press Enter or click "✓ Continue")
6. **Enter new feature name**: `user_profile`
7. **Review the files** to be created (press Enter or click "✓ Yes, Create Feature")

✅ You should now see a new `user_profile` folder with all files renamed!

### 2. Use with Your Own Project

1. Open your project in VSCode
2. Find a feature folder you want to clone
3. Right-click on the folder
4. Select **"Clone Feature Structure"**
5. **Press Enter** to confirm the detected architecture
6. **Enter** the new feature name
7. **Press Enter** to confirm and create!

### 💡 Pro Tips

- **Keyboard shortcuts**: Press Enter to accept, Escape to cancel at any step
- **Quick navigation**: The "Continue" and "Create" options are pre-selected
- **Review first**: Scroll through the file list before confirming
- **Name matching**: Only files containing the feature name are cloned

## What Happens When You Clone?

### Folder Structure (Preserved)
```
product_barcode/          →  user_profile/
├── data/                 →  ├── data/
│   └── model/            →  │   └── model/
│       ├── barcode.dart  →  │       ├── profile.dart  ✅ (has feature name)
│       └── config.json   →  │       └── (skipped)     ❌ (no feature name)
└── providers/            →  └── providers/
    └── barcode.dart      →      └── profile.dart      ✅
```

### Smart File Filtering
- ✅ Files with feature name in filename are cloned and renamed
- ❌ Files without feature name are skipped (like `index.ts`, `config.json`)
- 📁 All folders are preserved (even if they become empty)

### Content Changes (Automatic)
```
BarcodeModel         →  ProfileModel        (PascalCase)
product_barcode      →  user_profile        (snake_case)
ProductBarcode       →  UserProfile         (PascalCase)
productBarcode       →  userProfile         (camelCase)
PRODUCT_BARCODE      →  USER_PROFILE        (UPPER_CASE)
```

### Import Updates (Automatic)
```dart
// Before
import '../data/model/barcode_model.dart';
class BarcodeController { ... }

// After
import '../data/model/profile_model.dart';
class ProfileController { ... }
```

## Command Palette Alternative

You can also use the Command Palette:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: "Clone Feature Structure"
3. Select your feature folder when prompted

## Keyboard Shortcut (Optional)

You can add a keyboard shortcut in VSCode:

1. Open Keyboard Shortcuts: `Ctrl+K Ctrl+S`
2. Search for "Clone Feature Structure"
3. Add your preferred shortcut (e.g., `Ctrl+Alt+C`)

## File Structure Requirements

For best results, your feature folder should:

✅ **Include feature name in filenames** - Files should contain the feature name (e.g., `user_auth_service.ts`)
✅ **Use relative imports** - Better for path replacement
✅ **Follow a clear pattern** - Helps with architecture detection
✅ **Keep related code together** - All feature files in one folder

Example good structure:
```
user_auth/                           ← Feature name
├── models/
│   ├── user_auth_model.dart         ✅ Has feature name
│   └── constants.dart               ⚠️  Will be skipped
├── controllers/
│   └── user_auth_controller.dart    ✅ Has feature name
└── services/
    ├── user_auth_service.dart       ✅ Has feature name
    └── helper.dart                  ⚠️  Will be skipped
```

**Note:** Files without the feature name (like `helper.dart`, `constants.dart`) are intentionally skipped to avoid copying unrelated code. The folder structure is preserved so you can add new files later.

## Common Architectures Detected

| Architecture | Folders | Files |
|-------------|---------|-------|
| **Flutter Riverpod** | data, domain, presentation, providers | *_model.dart, *_repository.dart, *_provider.dart |
| **MVC** | models, views, controllers | *Model.*, *View.*, *Controller.* |
| **MVVM** | models, views, viewmodels | *Model.*, *View.*, *ViewModel.* |
| **Node.js MVC** | models, routes, controllers | *.js, *.ts |
| **Custom** | Any structure | Any files |

## Next Steps

📖 **Read Full Documentation:**
- [USAGE_EXAMPLES.md](USAGE_EXAMPLES.md) - Real-world examples
- [TESTING.md](TESTING.md) - Comprehensive testing guide
- [INSTALLATION.md](INSTALLATION.md) - Detailed installation

🧪 **Try the Test Examples:**
- Flutter Riverpod: `test-examples/flutter-riverpod/`
- Node.js MVC: `test-examples/nodejs-mvc/`

🚀 **Start Using in Your Projects:**
- Works with any programming language
- Supports any architecture pattern
- No configuration needed

## Troubleshooting

### Extension not showing in menu?
- Make sure you right-clicked a **folder**, not a file
- Check that the extension is activated (check Extensions panel)

### Names not replaced correctly?
- Ensure consistent naming in source files
- Use feature name in file names and class names
- Avoid very short names (use at least 3 characters)

### Need help?
- Check console: View → Output → Extension Host
- Review test examples for reference patterns
- Read the detailed guides

## Video Tutorial

(Add a video link here if you create one)

## Feedback

Found a bug or have a suggestion? Please:
1. Check existing issues
2. Create a new issue with details
3. Include your source structure and expected output

---

**Happy Cloning! 🎉**

