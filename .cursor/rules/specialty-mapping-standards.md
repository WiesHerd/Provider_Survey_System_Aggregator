# Cursor Project Rules: Specialty Mapping - Enterprise Development Standards

## 🎯 **CRITICAL ENTERPRISE RULES - NEVER VIOLATE**

### **Type System Integrity**
- **NEVER create duplicate type definitions** - One source of truth only
- **NEVER use type aliases for the same concept** (e.g., `ISpecialtyMapping as NewISpecialtyMapping`)
- **NEVER create type conversion functions** - Types should be consistent across the entire feature
- **ALWAYS use shared types from `src/shared/types/`** for common entities
- **ALWAYS extend base interfaces** rather than duplicating them

### **Hook Architecture Standards**
- **NEVER create hooks > 200 lines** - Break them down immediately
- **NEVER mix concerns in a single hook** - One hook = One responsibility
- **ALWAYS use focused, single-purpose hooks**:
  - `useMappingState()` - State management only
  - `useMappingOperations()` - CRUD operations only
  - `useMappingSearch()` - Search/filtering only
  - `useAutoMapping()` - Auto-mapping logic only
- **ALWAYS memoize expensive computations** with `useMemo`
- **ALWAYS use `useCallback` for event handlers** passed to child components

### **Component Size Limits**
- **NEVER create components > 300 lines** - Break them down immediately
- **NEVER create components with > 10 props** - Use composition instead
- **ALWAYS use React.memo()** for components that receive complex props
- **ALWAYS implement proper error boundaries** for each major component
- **ALWAYS use semantic component names** that describe their purpose

### **Performance Standards**
- **NEVER render > 100 items without virtualization** - Use react-window or similar
- **NEVER perform expensive operations on every render** - Use useMemo/useCallback
- **ALWAYS debounce search inputs** (300ms minimum)
- **ALWAYS implement loading states** for async operations
- **ALWAYS use optimistic updates** for better UX

### **Data Management Standards**
- **NEVER mix data fetching with UI logic** - Separate concerns
- **ALWAYS use proper error handling** with try/catch and user feedback
- **ALWAYS implement proper loading states** for all async operations
- **ALWAYS validate data before processing** - Use Zod or similar
- **NEVER store derived state** - Compute it with useMemo instead

### **Code Organization Standards**
- **ALWAYS follow feature-based architecture**:
  ```
  src/features/mapping/
  ├── components/          # UI components only
  ├── hooks/              # Custom hooks only
  ├── services/           # Business logic only
  ├── types/              # Type definitions only
  ├── utils/              # Pure utility functions only
  └── index.ts            # Public API exports
  ```
- **NEVER place business logic in components** - Extract to hooks or services
- **NEVER place UI logic in hooks** - Keep hooks focused on data/state
- **ALWAYS create barrel exports** (index.ts) for clean imports

### **Testing Standards**
- **ALWAYS write unit tests** for utility functions
- **ALWAYS write integration tests** for hooks
- **ALWAYS write component tests** for UI components
- **NEVER commit code without tests** for new functionality

### **Documentation Standards**
- **ALWAYS write JSDoc comments** for public APIs
- **ALWAYS document complex business logic** with inline comments
- **ALWAYS update README** when adding new features
- **NEVER leave TODO comments** in production code

## 🚨 **ANTI-PATTERNS TO AVOID**

### **Type System Anti-Patterns**
```typescript
// ❌ NEVER DO THIS - Duplicate types
interface ISpecialtyMapping { ... }
interface ISpecialtyMapping as NewISpecialtyMapping { ... }

// ❌ NEVER DO THIS - Type conversion functions
const convertMapping = (old: OldType) => new NewType(old);

// ✅ ALWAYS DO THIS - Single source of truth
interface ISpecialtyMapping extends BaseEntity { ... }
```

### **Hook Anti-Patterns**
```typescript
// ❌ NEVER DO THIS - Massive hook with mixed concerns
const useMappingData = () => {
  // 500+ lines of mixed state, operations, search, etc.
};

// ✅ ALWAYS DO THIS - Focused, single-purpose hooks
const useMappingState = () => { /* state only */ };
const useMappingOperations = () => { /* CRUD only */ };
const useMappingSearch = () => { /* search only */ };
```

### **Component Anti-Patterns**
```typescript
// ❌ NEVER DO THIS - Massive component
const SpecialtyMapping = () => {
  // 400+ lines of mixed UI and logic
};

// ✅ ALWAYS DO THIS - Composed, focused components
const SpecialtyMapping = () => (
  <MappingProvider>
    <MappingHeader />
    <MappingTabs />
    <MappingContent />
  </MappingProvider>
);
```

## 📋 **MANDATORY CODE REVIEW CHECKLIST**

Before committing any specialty mapping code:

- [ ] **Type System**: No duplicate types, no type conversions
- [ ] **Hook Size**: All hooks < 200 lines, single responsibility
- [ ] **Component Size**: All components < 300 lines
- [ ] **Performance**: Memoized expensive operations, debounced inputs
- [ ] **Error Handling**: Proper try/catch, user feedback
- [ ] **Loading States**: All async operations have loading states
- [ ] **Testing**: Unit tests for utilities, integration tests for hooks
- [ ] **Documentation**: JSDoc for public APIs
- [ ] **Architecture**: Business logic separated from UI logic
- [ ] **Imports**: Clean barrel exports, no deep imports

## 🎯 **SUCCESS METRICS**

### **Code Quality Metrics**
- **Hook Complexity**: < 200 lines per hook
- **Component Complexity**: < 300 lines per component
- **Type Coverage**: 100% TypeScript strict mode
- **Test Coverage**: > 80% for new code
- **Performance**: < 16ms render time for large lists

### **Maintainability Metrics**
- **Cyclomatic Complexity**: < 10 per function
- **Import Depth**: < 3 levels deep
- **Code Duplication**: < 5% across feature
- **Documentation Coverage**: 100% for public APIs

### **Performance Metrics**
- **Bundle Size**: < 200KB for mapping feature
- **Time to Interactive**: < 2 seconds
- **Memory Usage**: < 50MB for 1000+ items
- **Search Response**: < 100ms for debounced search

---

**Remember**: This is a **world-class, enterprise-grade application used by professionals for critical business decisions**. Every line of code must be written with the precision and care of a 30-year veteran developer who understands that reliability, maintainability, and user experience are paramount.

**CRITICAL**: Never compromise on these standards. When in doubt, ask: "Would I be proud to show this code to a senior architect at Google, Microsoft, or Apple?" If the answer is no, refactor it.


















