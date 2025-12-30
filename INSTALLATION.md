# Installation & Development Guide

## Prerequisites

- Node.js (v18 or higher)
- VSCode (v1.75.0 or higher)
- npm or yarn

## Development Setup

1. **Clone or navigate to the extension directory:**
   ```bash
   cd vscode-feature-cloner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

4. **Open in VSCode:**
   ```bash
   code .
   ```

5. **Run the extension in Development Mode:**
   - Press `F5` to open a new VSCode window with the extension loaded
   - Or go to Run > Start Debugging

## Testing the Extension

### Test with Flutter/Riverpod Structure

1. Create a test Flutter feature structure or use the example from structures.md
2. In the Extension Development Host window, right-click on a feature folder
3. Select "Clone Feature Structure"
4. Follow the prompts to clone the structure

### Test with Other Architectures

The extension should work with:
- Node.js MVC projects
- React feature-based projects
- Any custom folder structure

## Building for Distribution

1. **Install vsce (VSCode Extension Packaging Tool):**
   ```bash
   npm install -g @vscode/vsce
   ```

2. **Package the extension:**
   ```bash
   npm run package
   ```
   This creates a `.vsix` file in the root directory.

3. **Install the packaged extension:**
   ```bash
   code --install-extension feature-cloner-1.0.0.vsix
   ```

## Publishing to Marketplace

1. **Create a publisher account:**
   - Visit https://marketplace.visualstudio.com/manage
   - Create a publisher ID

2. **Update package.json:**
   ```json
   {
     "publisher": "your-publisher-id"
   }
   ```

3. **Publish:**
   ```bash
   vsce publish
   ```

## Troubleshooting

### Extension doesn't activate
- Check the VSCode Output panel (View > Output) and select "Extension Host"
- Look for errors in the console

### Files not being created
- Ensure you have write permissions in the target directory
- Check that the source folder path is correct

### Name replacement not working
- The extension uses case-sensitive replacement
- Check that your feature name is properly formatted

## Directory Structure

```
vscode-feature-cloner/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── commands/
│   │   └── cloneFeatureCommand.ts
│   ├── scanner/
│   │   ├── structureScanner.ts
│   │   ├── patternAnalyzer.ts
│   │   └── architectureTypes.ts
│   ├── cloner/
│   │   ├── smartCloner.ts
│   │   └── contentReplacer.ts
│   └── utils/
│       ├── fileSystem.ts
│       └── naming.ts
├── dist/                      # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

Feel free to submit issues and enhancement requests!

