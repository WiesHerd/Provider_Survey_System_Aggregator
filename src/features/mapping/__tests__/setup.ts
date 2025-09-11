/**
 * Enterprise Testing Setup
 * Inspired by Google's testing infrastructure and Jest best practices
 * Provides comprehensive test utilities and mocks for specialty mapping components
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
    },
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16);
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          add: jest.fn(),
          get: jest.fn(),
          getAll: jest.fn(),
          put: jest.fn(),
          delete: jest.fn(),
          clear: jest.fn(),
        })),
      })),
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  })),
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Restore console for debugging when needed
export const restoreConsole = () => {
  global.console = originalConsole;
};

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/specialty-mapping',
    pathname: '/specialty-mapping',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  writable: true,
});

// Mock connection API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    addEventListener: jest.fn(),
  },
  writable: true,
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Global test utilities
export const createMockPerformanceMetrics = (overrides = {}) => ({
  renderTime: 10,
  memoryUsage: 50,
  interactionTime: 100,
  dataLoadTime: 500,
  searchResponseTime: 200,
  mappingOperationTime: 1000,
  errorRate: 0,
  successRate: 100,
  userSatisfactionScore: 95,
  ...overrides,
});

export const createMockPerformanceEvent = (overrides = {}) => ({
  id: 'test-event-id',
  type: 'render' as const,
  timestamp: Date.now(),
  duration: 10,
  metadata: { componentName: 'TestComponent' },
  severity: 'low' as const,
  ...overrides,
});

export const createMockSpecialtyMapping = (overrides = {}) => ({
  id: 'test-mapping-id',
  originalName: 'Test Specialty',
  standardizedName: 'TEST_SPECIALTY',
  surveySource: 'MGMA' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockUnmappedSpecialty = (overrides = {}) => ({
  id: 'test-unmapped-id',
  name: 'Unmapped Specialty',
  frequency: 5,
  surveySource: 'MGMA' as const,
  ...overrides,
});

export const createMockLearnedMapping = (overrides = {}) => ({
  id: 'test-learned-id',
  originalName: 'Learned Specialty',
  standardizedName: 'LEARNED_SPECIALTY',
  surveySource: 'MGMA' as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any> | any) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    duration: end - start,
  };
};

// Error testing utilities
export const createMockError = (message = 'Test error', name = 'TestError') => {
  const error = new Error(message);
  error.name = name;
  error.stack = `TestError: ${message}\n    at testFunction (test.js:1:1)`;
  return error;
};

// Component testing utilities
export const createMockProps = <T extends Record<string, any>>(defaultProps: T, overrides: Partial<T> = {}): T => ({
  ...defaultProps,
  ...overrides,
});

// Async testing utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForCondition = async (condition: () => boolean, timeout = 5000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await waitForNextTick();
  }
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Mock data generators
export const generateMockSpecialties = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `specialty-${i}`,
    name: `Specialty ${i}`,
    frequency: Math.floor(Math.random() * 100) + 1,
    surveySource: ['MGMA', 'Gallagher', 'Sullivan Cotter'][i % 3] as const,
  }));
};

export const generateMockMappings = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `mapping-${i}`,
    originalName: `Original Specialty ${i}`,
    standardizedName: `STANDARDIZED_${i}`,
    surveySource: ['MGMA', 'Gallagher', 'Sullivan Cotter'][i % 3] as const,
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Set up any additional test environment configuration
  jest.useFakeTimers();
};

export const teardownTestEnvironment = () => {
  // Clean up test environment
  jest.useRealTimers();
  jest.restoreAllMocks();
};
