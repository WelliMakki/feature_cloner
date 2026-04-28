# Changelog

All notable changes to this project will be documented in this file.


## [1.0.9] - 2026-04-28

### Added
- Node.js template cloning now supports service-layer scaffolding when a `service`/`services` layer exists, with CRUD-aligned placeholders across controller, service, and routes.
- Generated Node model placeholders now include practical guidance sections for indexing, virtuals, and hooks with example snippets to speed up customization.
- Added a manual release helper script at `scripts/release-vsix.sh` to streamline VSIX packaging without Azure login automation.
- Added npm release shortcuts for semver bump choice: `release:vsix`, `release:vsix:patch`, `release:vsix:minor`, and `release:vsix:major`.

### Changed
- Node.js clone behavior now defaults to template-first placeholders for generated layers (`models`, `controllers`, `routes`, and optional `services`) to avoid carrying source business logic into new features.
- Controller, service, and route placeholder comments were improved to be more actionable and consistent with common backend API response patterns.

### Fixed
- Fixed plain MVC clones occasionally preserving original endpoint logic when option flags were not present; Node generated files now still receive placeholder transformation via fallback detection.
- Fixed route scaffolding occasionally binding to the wrong identifier (e.g. `express` instead of the controller import), causing invalid generated route handlers.
- Fixed feature-name inference for controller/route files that use snake_case or kebab-case naming patterns.
- Fixed Node template output leaking legacy source references by stripping stale top-level helper imports from placeholderized services.
- Fixed Node model placeholder cleanup to remove virtuals, schema methods/statics, and pre/post hooks from cloned templates.
- Fixed lingering legacy comments in placeholderized schemas (including index/virtual/upload-image notes) to keep generated templates clean.

## [1.0.8] - 2026-04-07

### Fixed
- Fixed cloning of plural-named features (e.g. `contributions` → `new_feature`). Previously, only the exact plural form was replaced — class names like `ContributionModel`, `ContributionNotifier`, file names like `contribution_model.dart`, and variables like `contributionRepo` were left unchanged. The cloner now automatically derives the singular/stem form and replaces both plural and singular variations across file names and content. Supported patterns: `-s`, `-es`, `-ies`.
- Generated React/Next.js route files are now named `page.tsx` / `page.jsx` (lowercase) instead of `Page.tsx` / `Page.jsx`, matching the App Router file convention.

## [1.0.7] - 2026-04-05

### Fixed
- Generated React/Next.js route files are now named `page.tsx` / `page.jsx` (lowercase) instead of `Page.tsx` / `Page.jsx`, matching the App Router file convention and avoiding issues on case-sensitive filesystems.

## [1.0.5] - 2026-04-05

### Added
- **React & TypeScript support**: When cloning a feature that contains `.tsx` or `.jsx` files, the cloner now automatically generates a `page.tsx` / `page.jsx` with a placeholder component, ready to build on.
- Expanded known subfolder detection to cover common React/TS conventions: `api`, `types`, `store`, `pages`, `reducers`, `actions`, `sagas`, `selectors`, `__tests__`, and more.

### Fixed
- Fixed file and path naming when cloning single-word features (e.g. `brand` → `bug_report`). Previously, file names like `brand_details_cubit.dart` were incorrectly renamed to `bugReport_details_cubit.dart` instead of `bug_report_details_cubit.dart`. The cloner now detects the surrounding context (`_`, `-`, uppercase letter) to apply the correct case variant, while class names and variables continue to follow language conventions (`BugReportDetailsCubit`, `bugReportSlug`).

## [1.0.3] - 2026-04-04

### Fixed
- Improved feature filename matching to handle common singular/plural variations (`s`, `es`, `ies`) so related files such as `api_target_screen.dart` and `api_targets_create_screen.dart` are both detected.
- Fixed subfolder-selection behavior so selecting a known feature subfolder (for example, `providers`) correctly resolves the parent feature context before cloning.

### Added
- Added support for cloning specific top-level subfolder(s) into `targetFeature/subfolder`.
- Added merge confirmation when subfolder cloning into an existing target feature directory.
- Added conflict-aware merge messaging that lists existing files that would be overwritten.
- Added fallback merge-and-retry flow when clone fails with an existing target directory error.

