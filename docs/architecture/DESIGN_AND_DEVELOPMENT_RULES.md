# 🎨 Design & Development Rules - Survey Aggregator

## 🚨 CRITICAL QUALITY STANDARDS - NEVER COMPROMISE

### **Design Excellence Standards**
- **ALWAYS prioritize user experience** - Every layout decision must enhance usability
- **NEVER create cramped or inefficient layouts** - Use space intelligently
- **ALWAYS maintain visual hierarchy** - Clear information architecture
- **NEVER use inconsistent spacing** - Follow established spacing patterns
- **ALWAYS consider responsive design** - Mobile-first approach

### **Layout & Spacing Rules**
- **Consistent spacing**: Use `gap-4` for standard spacing, `gap-6` for section breaks
- **Grid systems**: Prefer `grid-cols-5` for 5 items, `grid-cols-3` for 3 items, etc.
- **Responsive breakpoints**: `lg:` for desktop, `md:` for tablet, mobile-first
- **Container padding**: `p-6` for cards, `px-4 py-2` for buttons
- **Section margins**: `space-y-4` for related elements, `space-y-6` for sections

### **Component Design Standards**
- **Card styling**: `bg-white rounded-xl shadow-sm border border-gray-200 p-6`
- **Button styling**: Consistent with established patterns (see below)
- **Form fields**: Material-UI with consistent styling and focus states
- **Typography**: Clear hierarchy with proper font weights and sizes

### **Button Design Standards**
```typescript
// Primary buttons
className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"

// Secondary buttons
className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"

// Icon buttons
className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
```

### **Form Field Standards**
```typescript
// Consistent Material-UI styling
sx={{
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#3b82f6',
  },
}}
```

## 🏗️ Architecture & Code Quality

### **Component Structure Standards**
- **NEVER exceed 300 lines** - Break down immediately if approaching limit
- **ALWAYS use semantic naming** - Component names should describe purpose
- **ALWAYS separate concerns** - Business logic separate from UI
- **ALWAYS use TypeScript interfaces** - No `any` types allowed
- **ALWAYS write JSDoc comments** - Document public APIs

### **State Management Standards**
- **Custom hooks for complex state** - Extract reusable logic
- **Proper dependency arrays** - Always include all dependencies
- **Memoization for expensive calculations** - Use `useMemo` and `useCallback`
- **Error boundaries** - Implement for each feature

### **Performance Standards**
- **Lazy loading** - Route-based code splitting
- **React.memo()** - For expensive components
- **Bundle size limits** - < 500KB initial, < 200KB per feature
- **Lighthouse score** - > 90 in all categories

## 🎯 Layout Optimization Rules

### **Filter Layout Standards**
- **Single row for 5 or fewer filters** - Use `grid-cols-5` with `gap-4`
- **Two rows for 6+ filters** - Group logically with `grid-cols-3` and `grid-cols-2`
- **Responsive behavior** - Stack on mobile, grid on desktop
- **Consistent field widths** - Equal distribution across available space

### **Table Layout Standards**
- **HTML tables for small datasets** - < 50 rows, simple comparisons
- **AG Grid for complex datasets** - > 50 rows, advanced features needed
- **Consistent column sizing** - Proportional to content importance
- **Proper spacing** - Adequate padding and margins

### **Card Layout Standards**
- **Consistent padding** - `p-6` for main content areas
- **Proper spacing between cards** - `space-y-6` for sections
- **Clear visual hierarchy** - Headers, content, actions properly spaced
- **Responsive grid** - Adapt to screen size appropriately

## 🔧 Development Workflow

### **Before Making Changes**
1. **Analyze existing patterns** - Look at similar components
2. **Consider user experience** - How will this affect usability?
3. **Plan the layout** - Sketch or describe the intended result
4. **Check for consistency** - Match existing design patterns

### **During Implementation**
1. **Follow established patterns** - Use existing styling and structure
2. **Test responsive behavior** - Check mobile, tablet, desktop
3. **Validate accessibility** - Proper labels, focus states, contrast
4. **Ensure performance** - No unnecessary re-renders or calculations

### **After Implementation**
1. **Review the result** - Does it match the intended design?
2. **Test functionality** - All features work as expected
3. **Check for regressions** - No broken existing functionality
4. **Validate against rules** - Follows all established standards

## 🚨 Common Mistakes to Avoid

### **Layout Mistakes**
- ❌ **Cramped spacing** - Insufficient gaps between elements
- ❌ **Inconsistent grids** - Different column counts without reason
- ❌ **Poor responsive design** - Not adapting to screen sizes
- ❌ **Inconsistent padding** - Different spacing patterns

### **Component Mistakes**
- ❌ **Large components** - Exceeding 300 lines
- ❌ **Mixed concerns** - Business logic in UI components
- ❌ **Poor naming** - Unclear component or function names
- ❌ **Missing types** - Using `any` instead of proper interfaces

### **Performance Mistakes**
- ❌ **Unnecessary re-renders** - Missing dependencies or memoization
- ❌ **Large bundles** - Importing entire libraries
- ❌ **Blocking operations** - Heavy calculations in render
- ❌ **Memory leaks** - Not cleaning up effects or listeners

## 📋 Quality Checklist

### **Before Committing**
- [ ] Component size < 300 lines
- [ ] Consistent spacing and layout
- [ ] Responsive design tested
- [ ] TypeScript strict mode passes
- [ ] No console errors or warnings
- [ ] Performance impact assessed
- [ ] Accessibility standards met
- [ ] Design patterns followed

### **Layout Review**
- [ ] Proper grid system used
- [ ] Consistent spacing applied
- [ ] Responsive breakpoints correct
- [ ] Visual hierarchy clear
- [ ] No cramped or inefficient layouts
- [ ] Matches existing design patterns

---

**Remember**: This is a **world-class, enterprise-grade application**. Every design decision and code change must reflect Silicon Valley quality standards. Think like you're building for Google, Facebook, or Apple - clean, scalable, performant, and maintainable.

**CRITICAL**: Never compromise on design quality or user experience. If a layout doesn't feel right, iterate until it does. Quality over speed, always.
