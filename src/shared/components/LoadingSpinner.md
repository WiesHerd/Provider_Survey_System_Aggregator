# LoadingSpinner Component Guide

## 🎯 Overview

The `LoadingSpinner` component provides a modern, consistent loading experience across the entire Survey Aggregator application. It replaces all previous inconsistent loading implementations with a unified, enterprise-grade solution.

## ✨ Features

- **Modern Design**: Smooth animations with enterprise-grade styling
- **Multiple Variants**: Different sizes, colors, and contexts
- **Consistent UX**: Same loading experience everywhere in the app
- **Performance Optimized**: Lightweight and smooth animations
- **Accessibility**: Proper ARIA labels and screen reader support
- **Backward Compatible**: Works with existing code

## 🚀 Usage

### Basic Import
```typescript
import { LoadingSpinner } from '@/shared/components';
// or
import LoadingSpinner, { ButtonSpinner, InlineSpinner } from '@/shared/components';
```

### Component Variants

#### 1. **LoadingSpinner** (Main Component)
```typescript
<LoadingSpinner 
  message="Loading data..." 
  size="md" 
  variant="primary"
  fullScreen={false}
  overlay={false}
/>
```

**Props:**
- `message?`: Loading message text
- `size?`: `'xs' | 'sm' | 'md' | 'lg' | 'xl'`
- `variant?`: `'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'`
- `fullScreen?`: Full screen loading overlay
- `overlay?`: Modal overlay with backdrop
- `showMessage?`: Show/hide message text
- `className?`: Additional CSS classes

#### 2. **ButtonSpinner** (For Button Loading States)
```typescript
<button disabled={loading}>
  {loading ? <ButtonSpinner size="sm" /> : 'Submit'}
</button>
```

#### 3. **PageSpinner** (Full Page Loading)
```typescript
<PageSpinner message="Loading page..." />
```

#### 4. **InlineSpinner** (Small Content Areas)
```typescript
<InlineSpinner message="Loading..." size="md" />
```

#### 5. **SuspenseSpinner** (React Suspense Fallback)
```typescript
<Suspense fallback={<SuspenseSpinner message="Loading component..." />}>
  <LazyComponent />
</Suspense>
```

#### 6. **OverlaySpinner** (Modal/Dialog Loading)
```typescript
{isProcessing && <OverlaySpinner message="Processing..." />}
```

#### 7. **TableSpinner** (Data Table Loading)
```typescript
<TableSpinner message="Loading data..." rows={5} />
```

## 🎨 Size Reference

| Size | Dimensions | Use Case |
|------|------------|----------|
| `xs` | 16x16px | Small icons, chips |
| `sm` | 24x24px | Buttons, inline text |
| `md` | 32x32px | Cards, sections |
| `lg` | 48x48px | Pages, main content |
| `xl` | 64x64px | Full screen, splash |

## 🌈 Variant Colors

| Variant | Color | Use Case |
|---------|-------|----------|
| `default` | Gray | Neutral loading |
| `primary` | Indigo | Main actions |
| `secondary` | Light Gray | Secondary content |
| `success` | Green | Success operations |
| `warning` | Amber | Warning states |
| `error` | Red | Error recovery |

## 📍 Common Use Cases

### 1. **Data Loading**
```typescript
const MyComponent = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  if (loading) {
    return <InlineSpinner message="Loading survey data..." />;
  }

  return <DataTable data={data} />;
};
```

### 2. **Form Submission**
```typescript
const MyForm = () => {
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <form>
        {/* form fields */}
        <button disabled={submitting}>
          {submitting ? <ButtonSpinner size="sm" /> : 'Save'}
        </button>
      </form>
      {submitting && <OverlaySpinner message="Saving changes..." />}
    </>
  );
};
```

### 3. **Lazy Loading**
```typescript
const LazyComponent = lazy(() => import('./MyComponent'));

const App = () => (
  <Suspense fallback={<SuspenseSpinner message="Loading component..." />}>
    <LazyComponent />
  </Suspense>
);
```

### 4. **Full Page Loading**
```typescript
const Dashboard = () => {
  const [initializing, setInitializing] = useState(true);

  if (initializing) {
    return <PageSpinner message="Initializing dashboard..." />;
  }

  return <DashboardContent />;
};
```

## 🚫 What NOT to Use

❌ **Don't create custom spinners:**
```typescript
// BAD - Inconsistent
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>

// BAD - Hard to maintain
<div>Loading...</div>
```

✅ **Use standardized components:**
```typescript
// GOOD - Consistent and maintainable
<InlineSpinner message="Loading..." />
```

## 🔄 Migration from Old Spinners

### Replace These Patterns:

1. **Custom animate-spin divs:**
   ```typescript
   // Before
   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
   
   // After
   <InlineSpinner size="md" />
   ```

2. **Simple "Loading..." text:**
   ```typescript
   // Before
   <div>Loading...</div>
   
   // After
   <InlineSpinner message="Loading..." />
   ```

3. **Suspense fallbacks:**
   ```typescript
   // Before
   <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
   
   // After
   <Suspense fallback={<SuspenseSpinner />}>
   ```

## 🏗️ Architecture

The spinner system is built with:

- **Modular Design**: Each variant serves a specific purpose
- **TypeScript Support**: Full type safety
- **Performance**: Optimized animations and minimal re-renders
- **Accessibility**: ARIA labels and screen reader support
- **Customizable**: Props for different use cases
- **Consistent**: Same design language across all variants

## 📦 File Structure

```
src/shared/components/
├── LoadingSpinner.tsx     # Main spinner component
├── index.ts              # Barrel exports
└── LoadingSpinner.md     # This documentation
```

## 🎯 Best Practices

1. **Choose the Right Variant**: Use the appropriate spinner for your context
2. **Meaningful Messages**: Provide helpful loading messages
3. **Consistent Sizing**: Use standard sizes for consistent UX
4. **Performance**: Don't overuse overlays or full-screen spinners
5. **Accessibility**: Always provide meaningful messages for screen readers

## 🔮 Future Enhancements

- Skeleton loading states for specific content types
- Progress indicators for long operations
- Custom animation speeds
- Theme integration
- Analytics tracking for loading performance
