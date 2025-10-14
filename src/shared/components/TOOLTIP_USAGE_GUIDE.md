# Standard Tooltip Usage Guide

## 🎯 Single Source of Truth

**CRITICAL**: All tooltips in the app should use the `StandardTooltip` component from `src/shared/components`. This ensures consistency and avoids multiple tooltip implementations.

## 📦 Import

```typescript
import { StandardTooltip, SimpleTooltip, RichTooltip, HelpTooltip } from '../../../shared/components';
```

## 🚀 Usage Examples

### 1. Simple Text Tooltip
```typescript
<StandardTooltip title="This is a simple tooltip">
  <button>Hover me</button>
</StandardTooltip>
```

### 2. Rich Content Tooltip (HTML/JSX)
```typescript
<StandardTooltip 
  title={
    <div className="space-y-1">
      <div className="font-semibold">Title</div>
      <div className="text-sm">Description text</div>
      <div className="text-xs text-gray-300">Additional info</div>
    </div>
  }
  placement="bottom"
  size="large"
>
  <button>Complex tooltip</button>
</StandardTooltip>
```

### 3. Help Tooltip (for info icons)
```typescript
<HelpTooltip helpText="This explains what this feature does">
  <InformationCircleIcon className="w-5 h-5 text-gray-400" />
</HelpTooltip>
```

### 4. Quick Simple Tooltip
```typescript
<SimpleTooltip text="Quick tooltip text">
  <button>Simple</button>
</SimpleTooltip>
```

## 🎨 Available Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `React.ReactNode` | - | Tooltip content |
| `placement` | `string` | `'top'` | Position: top, bottom, left, right, etc. |
| `arrow` | `boolean` | `true` | Show arrow |
| `enterDelay` | `number` | `500` | Delay before showing (ms) |
| `leaveDelay` | `number` | `200` | Delay before hiding (ms) |
| `disabled` | `boolean` | `false` | Disable tooltip |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size variant |
| `className` | `string` | `''` | Additional CSS classes |

## 🎯 Best Practices

### ✅ DO
- Use `StandardTooltip` for all tooltips
- Use `HelpTooltip` for info icons
- Use `RichTooltip` for complex content
- Keep tooltip text concise but informative
- Use appropriate placement (bottom for buttons)

### ❌ DON'T
- Use MUI Tooltip directly (use StandardTooltip instead)
- Create custom tooltip implementations
- Use tooltips for critical information (use modals instead)
- Make tooltips too long (keep under 300 characters)

## 🔧 Migration from MUI Tooltip

**Before:**
```typescript
import { Tooltip } from '@mui/material';

<Tooltip title="Simple tooltip">
  <button>Button</button>
</Tooltip>
```

**After:**
```typescript
import { StandardTooltip } from '../../../shared/components';

<StandardTooltip title="Simple tooltip">
  <button>Button</button>
</StandardTooltip>
```

## 🎨 Styling

The tooltip uses enterprise-grade styling:
- **Background**: Dark gray (#1f2937)
- **Text**: Light gray (#f9fafb)
- **Border**: Subtle gray border
- **Shadow**: Professional drop shadow
- **Font**: Consistent with app typography
- **Sizes**: Small (12px), Medium (14px), Large (16px)

## 📱 Responsive Design

Tooltips automatically adjust:
- **Mobile**: Smaller size, shorter delays
- **Desktop**: Full size, standard delays
- **Touch devices**: Appropriate touch targets

## 🔍 Examples in Codebase

See these files for real usage examples:
- `src/features/mapping/components/SpecialtyMappingHeader.tsx` - Apply All button tooltip
- `src/features/fmv/components/AggregationMethodSelector.tsx` - Info tooltips
- `src/components/MappedColumns.tsx` - Action button tooltips

