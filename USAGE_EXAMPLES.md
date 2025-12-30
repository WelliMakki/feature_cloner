# Usage Examples

This document provides real-world examples of using the Feature Cloner extension.

## Example 1: Flutter Riverpod Feature

### Scenario
You have a `product_barcode` feature and want to create a similar `user_profile` feature.

### Original Structure
```
lib/features/product_barcode/
├── data/
│   ├── model/
│   │   └── barcode_exists_model.dart
│   └── repositories_impl/
│       └── barcode_repo_impl.dart
├── domain/
│   └── repositories/
│       └── barcode_repository.dart
├── presentation/
│   └── screens/
│       └── product_barcode_screen.dart
└── providers/
    ├── product_barcode_notifier.dart
    ├── product_barcode_provider.dart
    └── product_barcode_state.dart
```

### Steps

1. Right-click on `product_barcode` folder
2. Select "Clone Feature Structure"
3. Extension shows:
   ```
   Detected Architecture Pattern:
   
   Architecture: Flutter Riverpod
   Confidence: 85%
   Description: Flutter Riverpod Architecture - 4 layers (data, domain, presentation, providers) - 7 files
   
   Structure:
     data/ (2 files: model, impl)
     domain/ (1 files: repository)
     presentation/ (1 files: screen)
     providers/ (3 files: notifier, provider, state)
   ```
4. Click "Continue"
5. Enter: `user_profile`
6. Review preview and click "Create"

### Result
```
lib/features/user_profile/
├── data/
│   ├── model/
│   │   └── profile_exists_model.dart
│   └── repositories_impl/
│       └── profile_repo_impl.dart
├── domain/
│   └── repositories/
│       └── profile_repository.dart
├── presentation/
│   └── screens/
│       └── user_profile_screen.dart
└── providers/
    ├── user_profile_notifier.dart
    ├── user_profile_provider.dart
    └── user_profile_state.dart
```

### Content Changes

**Before (barcode_exists_model.dart):**
```dart
class BarcodeExistsModel {
  final String barcode;
  // ...
}
```

**After (profile_exists_model.dart):**
```dart
class ProfileExistsModel {
  final String profile;
  // ...
}
```

**Imports Updated:**
```dart
// Before
import '../data/model/barcode_exists_model.dart';

// After
import '../data/model/profile_exists_model.dart';
```

## Example 2: Node.js MVC Feature

### Scenario
Clone a `user_auth` feature to create `product_catalog`.

### Original Structure
```
server/features/user_auth/
├── models/
│   └── UserAuthModel.js
├── controllers/
│   └── userAuthController.js
└── routes/
    └── userAuthRoutes.js
```

### Steps

1. Right-click on `user_auth` folder
2. Select "Clone Feature Structure"
3. Extension detects "MVC Express" architecture
4. Enter: `product_catalog`
5. Click "Create"

### Result
```
server/features/product_catalog/
├── models/
│   └── ProductCatalogModel.js
├── controllers/
│   └── productCatalogController.js
└── routes/
    └── productCatalogRoutes.js
```

### Content Changes

**Before (UserAuthModel.js):**
```javascript
const UserAuthModel = mongoose.model('UserAuth', userAuthSchema);
module.exports = UserAuthModel;
```

**After (ProductCatalogModel.js):**
```javascript
const ProductCatalogModel = mongoose.model('ProductCatalog', productCatalogSchema);
module.exports = ProductCatalogModel;
```

## Example 3: React Feature with Hooks

### Scenario
Clone a `shopping-cart` feature to create `wishlist`.

### Original Structure
```
src/features/shopping-cart/
├── components/
│   ├── ShoppingCartItem.tsx
│   └── ShoppingCartList.tsx
├── hooks/
│   └── useShoppingCart.ts
└── types/
    └── shoppingCart.types.ts
```

### Steps

1. Right-click on `shopping-cart`
2. Select "Clone Feature Structure"
3. Enter: `wishlist`
4. Click "Create"

### Result
```
src/features/wishlist/
├── components/
│   ├── WishlistItem.tsx
│   └── WishlistList.tsx
├── hooks/
│   └── useWishlist.ts
└── types/
    └── wishlist.types.ts
```

## Example 4: Custom Architecture

### Scenario
You have a custom architecture that doesn't match predefined patterns.

### Original Structure
```
modules/payment_processing/
├── api/
│   └── payment_processing_api.ts
├── services/
│   └── PaymentProcessingService.ts
├── utils/
│   └── payment_processing_utils.ts
└── config/
    └── payment_processing_config.ts
```

### Steps

1. Right-click on `payment_processing`
2. Extension detects "Custom Architecture"
3. Enter: `notification_system`
4. Click "Create"

### Result

All files and content are renamed appropriately, even though the extension doesn't have a predefined pattern for this structure.

## Tips for Best Results

### 1. Consistent Naming
Use consistent naming in your source feature:
- All related files should include the feature name
- Use the same case style throughout (snake_case, PascalCase, etc.)

### 2. Clear Feature Boundaries
Keep feature folders self-contained:
- All feature-related code in one folder
- Relative imports within the feature
- Clear separation from other features

### 3. Naming Conventions by Language

**Dart/Flutter:**
- Folders: `snake_case`
- Files: `feature_name_type.dart`
- Classes: `FeatureNameType`

**TypeScript/JavaScript:**
- Folders: `kebab-case` or `snake_case`
- Files: `FeatureName.tsx` or `feature-name.ts`
- Classes/Components: `FeatureName`

**Python:**
- Folders: `snake_case`
- Files: `feature_name_module.py`
- Classes: `FeatureNameClass`

### 4. Review Before Confirming
Always review the preview before creating:
- Check file paths look correct
- Verify the number of files matches expectations
- Ensure architecture detection is accurate

## Troubleshooting Examples

### Issue: Some names not replaced

**Problem:** Using abbreviated names like "auth" in `user_auth` but full names elsewhere.

**Solution:** Use consistent naming. Either:
- `user_auth` everywhere (files, classes, variables)
- OR `user_authentication` everywhere

### Issue: Imports broken

**Problem:** Absolute imports don't get updated.

**Solution:** Use relative imports within features:
```dart
// Good
import '../data/model/user_model.dart';

// Avoid
import 'package:app/features/user_auth/data/model/user_model.dart';
```

### Issue: Partial names in unrelated code

**Problem:** Word "user" appears in comments/strings and gets replaced.

**Solution:** Use more specific feature names:
- Instead of `user`: `user_authentication`
- Instead of `product`: `product_catalog`

## Advanced Usage

### Cloning Nested Features

You can clone features with deeply nested structures:
```
feature/
├── sub-feature-a/
│   ├── components/
│   └── utils/
└── sub-feature-b/
    ├── services/
    └── types/
```

The extension preserves the entire structure.

### Batch Cloning

While the extension doesn't support batch operations directly, you can:
1. Clone the first feature
2. Verify it works correctly
3. Clone additional features quickly using the same source

### Post-Clone Customization

After cloning:
1. Review generated files
2. Customize business logic specific to the new feature
3. Update comments and documentation
4. Add feature-specific functionality
5. Test thoroughly

## Best Practices

1. **Start with a solid template feature**: Your first feature should be well-structured as a template
2. **Test the clone**: Always test the cloned feature immediately
3. **Version control**: Commit before cloning so you can easily revert if needed
4. **Review changes**: Use git diff to review what was changed
5. **Customize immediately**: Add feature-specific logic right after cloning

