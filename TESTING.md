# Testing Guide

This guide will help you test the Feature Cloner extension.

## Test Setup

### 1. Install Dependencies

```bash
cd vscode-feature-cloner
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

## Running Tests

### Test 1: Flutter Riverpod Architecture

A sample Flutter feature structure is provided in `test-examples/flutter-riverpod/product_barcode/`.

**Steps:**

1. Open the extension in VSCode: `code .`
2. Press `F5` to launch the Extension Development Host
3. In the new window, open the `test-examples` folder
4. Navigate to `flutter-riverpod/` in the Explorer
5. Right-click on the `product_barcode` folder
6. Select "Clone Feature Structure"
7. You should see a detection dialog showing:
   ```
   Architecture: Flutter Riverpod
   Confidence: 80-90%
   Structure:
     data/ (2 files: model, repositories_impl)
     domain/ (1 files: repository)
     presentation/ (1 files: screen)
     providers/ (3 files: notifier, state, provider)
   ```
8. Click "Continue"
9. Enter a new feature name, e.g., `user_profile`
10. Review the preview of files to be created
11. Click "Create"

**Expected Result:**

A new folder `user_profile` should be created with:
- All folder structure preserved
- All files renamed (e.g., `barcode_model.dart` → `profile_model.dart`)
- All content updated (e.g., `BarcodeExistsModel` → `ProfileExistsModel`)
- All imports updated (e.g., `import '../data/model/barcode_model.dart'` → `import '../data/model/profile_model.dart'`)

### Test 2: Custom Architecture

**Steps:**

1. Create your own custom folder structure
2. Right-click on it
3. Select "Clone Feature Structure"
4. The extension should detect it as "Custom Architecture"
5. Follow the prompts to clone it

### Test 3: Different Naming Conventions

Test with different naming styles:
- snake_case: `product_barcode`
- kebab-case: `product-barcode`
- PascalCase: `ProductBarcode`
- camelCase: `productBarcode`

The extension should handle all variations correctly.

## Verification Checklist

After cloning a feature, verify:

- [ ] All folders are created with correct names
- [ ] All files are created with correct names
- [ ] File contents have feature names replaced
- [ ] Imports are updated correctly
- [ ] Class names are updated correctly
- [ ] Variable names are updated correctly
- [ ] Case styles are preserved (PascalCase → PascalCase, snake_case → snake_case, etc.)
- [ ] No broken references or imports

## Manual Testing with Real Projects

### Flutter Project

1. Create or use an existing Flutter project with feature folders
2. Clone a real feature
3. Run `flutter analyze` to check for errors
4. Try running the app with the new feature

### Node.js Project

1. Create or use an existing Node.js project
2. Clone a feature (e.g., MVC controller/model/route)
3. Run linting to check for errors
4. Test the cloned feature

### React Project

1. Create or use an existing React project
2. Clone a feature (e.g., component with hooks)
3. Run the app and verify the new feature works

## Debugging

If something goes wrong:

1. Open the Output panel: View → Output
2. Select "Extension Host" from the dropdown
3. Look for error messages
4. Check the console logs

## Common Issues

### Issue: Extension doesn't show in context menu

**Solution:** Make sure you're right-clicking on a folder, not a file.

### Issue: Files not created

**Solution:** Check file permissions and ensure target directory doesn't already exist.

### Issue: Content not replaced correctly

**Solution:** Check that the feature name is properly detected. The extension extracts it from the folder name.

### Issue: Imports broken after cloning

**Solution:** This might happen if import paths use absolute paths. The extension handles relative paths best.

## Performance Testing

Test with folders of various sizes:

- Small: 5-10 files
- Medium: 20-50 files
- Large: 100+ files

The extension should handle all sizes efficiently with progress indication.

## Reporting Issues

If you encounter any issues, please include:

1. VSCode version
2. Extension version
3. Source folder structure (tree output)
4. Expected behavior
5. Actual behavior
6. Error messages from console

