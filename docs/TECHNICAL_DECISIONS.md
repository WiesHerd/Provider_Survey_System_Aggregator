# Technical Decisions & Standards

## Chart Library Decision

**Decision Date:** December 2024  
**Status:** ✅ Approved for all new chart implementations

### Chosen Library: **Recharts**

**Rationale:**
- **Best React Integration**: Built specifically for React, not a wrapper
- **TypeScript Support**: Excellent TypeScript definitions
- **Active Maintenance**: Regularly updated, strong community
- **Performance**: Optimized for React's rendering model
- **Documentation**: Comprehensive and React-focused
- **Bundle Size**: Reasonable (~200KB)

### Migration Strategy

**For New Features:**
- ✅ Use **Recharts** exclusively for all new chart implementations
- ✅ Do NOT use `chart.js`, `echarts`, or `react-chartjs-2` in new code

**For Existing Code:**
- ⏳ Migrate existing charts incrementally as features are touched
- ⏳ No rush - existing charts work fine
- ⏳ Priority: Low (can be done during polish phase)

### Current Chart Libraries (To Be Consolidated)

1. **chart.js + react-chartjs-2** - Used in some components
2. **echarts + echarts-for-react** - Used in some components  
3. **recharts** - ✅ **STANDARD for new code**

### Implementation Example

```typescript
// ✅ CORRECT - Use Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// ❌ INCORRECT - Don't use in new code
import { Chart } from 'chart.js';
import ReactECharts from 'echarts-for-react';
```

---

## Drag and Drop Library

**Decision Date:** December 2024  
**Status:** ✅ Standardized

### Chosen Library: **@dnd-kit**

**Rationale:**
- **Modern & Maintained**: Active development, not deprecated
- **React 18 Compatible**: Fully supports concurrent features
- **Accessibility**: Built-in ARIA support
- **TypeScript**: Excellent type definitions
- **Performance**: Optimized for React

### Removed Library: **react-beautiful-dnd**

**Reason:** Deprecated, no longer maintained

**Status:** ✅ Removed from package.json (December 2024)

**Note:** `ReportBuilder.tsx` was already using HTML5 drag-and-drop API, so no migration needed.

---

## Logging Standard

**Decision Date:** December 2024  
**Status:** ✅ Implemented

### Standard: Use `logger` utility from `@/shared/utils/logger`

**Rationale:**
- **Production Safety**: Automatically disabled in production
- **Performance**: No console overhead in production builds
- **Security**: Prevents exposing internal logic to users
- **Consistency**: Single logging interface across app

### Usage

```typescript
// ✅ CORRECT - Use logger
import { logger } from '@/shared/utils/logger';

logger.log('Debug message', data);
logger.error('Error occurred', error);
logger.warn('Warning message');
logger.info('Info message', structuredData);
logger.performance('Operation', duration);

// ❌ INCORRECT - Don't use console.log directly
console.log('Message'); // Will be removed in production
```

### Migration Strategy

**New Code:**
- ✅ Always use `logger` instead of `console.log`

**Existing Code:**
- ⏳ Migrate incrementally as files are touched
- ⏳ Priority: Low (can be done during polish phase)
- ⏳ Final cleanup: Remove all console.log before Firebase deployment

---

## Build Tool

**Current:** Create React App (react-scripts 5.0.1)  
**Future Consideration:** Vite migration

**Status:** Keep CRA for now, consider Vite migration after Firebase deployment

**Rationale:**
- CRA works fine for development
- Migration can be done without UI changes
- Better to complete features first, then optimize build tool

---

## TypeScript Version

**Current:** TypeScript 4.9.5  
**Future:** Consider upgrading to TypeScript 5.x

**Status:** Keep 4.9.5 for now, upgrade after feature completion

**Rationale:**
- Version 4.9.5 is stable and functional
- Upgrade is low-risk but not urgent
- Can be done during polish phase

---

## Bundle Size

**Target:** <500KB initial load  
**Status:** ⏳ To be measured before Firebase deployment

**Action Items:**
- Run `webpack-bundle-analyzer` before deployment
- Identify large dependencies
- Optimize before production

---

## Firebase Deployment Considerations

### Pre-Deployment Checklist

- [ ] Remove all console.log statements (use logger)
- [ ] Run bundle size analysis
- [ ] Consolidate chart libraries (or optimize bundle)
- [ ] Complete IndexedDB persistence (Phase 8)
- [ ] Add critical path tests
- [ ] Performance audit
- [ ] Security audit

### Post-Deployment Monitoring

- Monitor bundle size
- Track error logs (Firebase Analytics)
- Monitor performance metrics
- User feedback collection

---

**Last Updated:** December 2024


