# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-04-04

### Fixed
- Improved feature filename matching to handle common singular/plural variations (`s`, `es`, `ies`) so related files such as `api_target_screen.dart` and `api_targets_create_screen.dart` are both detected.
- Fixed subfolder-selection behavior so selecting a known feature subfolder (for example, `providers`) correctly resolves the parent feature context before cloning.

### Added
- Added support for cloning specific top-level subfolder(s) into `targetFeature/subfolder`.
- Added merge confirmation when subfolder cloning into an existing target feature directory.
- Added conflict-aware merge messaging that lists existing files that would be overwritten.
- Added fallback merge-and-retry flow when clone fails with an existing target directory error.

