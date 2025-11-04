# 🎯 STANDARDIZED SPINNER - Microsoft/Google Style

## ⚡ CRITICAL RULE: ONE SPINNER EVERYWHERE

**The entire Survey Aggregator app uses ONE EXACT SAME SPINNER everywhere:**

- **Size**: Always 32x32px (`w-8 h-8`) for main spinner, 20x20px (`w-5 h-5`) for buttons
- **Colors**: Always `border-gray-200` background, `border-t-indigo-600` accent
- **Animation**: Always `1s linear` - no variations
- **Centering**: Always perfectly centered
- **Style**: Microsoft/Google professional standard

## ✅ CORRECT USAGE

```typescript
import { LoadingSpinner, ButtonSpinner, SuspenseSpinner } from '@/shared/components';

// ✅ CORRECT - Same spinner everywhere
<LoadingSpinner message="Loading data..." />
<ButtonSpinner />
<SuspenseSpinner />
```

## ❌ NEVER DO THIS

```typescript
// ❌ WRONG - Custom sizes
<LoadingSpinner size="sm" />

// ❌ WRONG - Custom colors  
<LoadingSpinner variant="success" />

// ❌ WRONG - Custom animations
<div className="animate-spin w-6 h-6..." />
```

## 🎯 Available Components

All use the EXACT SAME spinner, just different contexts:

1. **`LoadingSpinner`** - Main component (32x32px, centered)
2. **`ButtonSpinner`** - For buttons (20x20px, inline) 
3. **`PageSpinner`** - Full page (32x32px, full screen)
4. **`InlineSpinner`** - Content areas (32x32px, with padding)
5. **`SuspenseSpinner`** - React Suspense (32x32px, with padding)
6. **`OverlaySpinner`** - Modal overlays (32x32px, with backdrop)
7. **`TableSpinner`** - Data tables (32x32px, with skeleton)

## 🎨 Visual Specification

```css
/* Main Spinner - NEVER CHANGE */
.standard-spinner {
  width: 32px;           /* w-8 */
  height: 32px;          /* h-8 */
  border: 2px solid;     /* border-2 */
  border-color: #e5e7eb; /* border-gray-200 */
  border-top-color: #4f46e5; /* border-t-indigo-600 */
  border-radius: 50%;    /* rounded-full */
  animation: spin 1s linear infinite; /* animate-spin */
}

/* Button Spinner - NEVER CHANGE */
.button-spinner {
  width: 20px;           /* w-5 */
  height: 20px;          /* h-5 */
  /* Same colors and animation */
}
```

## 🚀 Implementation

The spinner system ignores all size/variant props to ensure consistency:

```typescript
// These props are IGNORED to maintain consistency
<LoadingSpinner 
  size="lg"        // ← IGNORED - always w-8 h-8
  variant="error"  // ← IGNORED - always same colors
  message="Loading..." // ← Used
  fullScreen={true}    // ← Used
/>
```

## 📍 Microsoft/Google Reference

Our spinner matches the professional standards of:
- **Microsoft**: Windows loading indicators
- **Google**: Material Design progress indicators  
- **Enterprise**: Professional, consistent, predictable

## ✅ Quality Checklist

- [ ] Same size everywhere (32x32px main, 20x20px button)
- [ ] Same colors everywhere (gray-200 + indigo-600)
- [ ] Same animation everywhere (1s linear)
- [ ] Always centered
- [ ] Professional appearance
- [ ] No custom variations

## 🎯 Result

**Every loading state in the app looks identical** - professional, consistent, and enterprise-grade, just like Microsoft and Google applications.
