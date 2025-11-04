import { IndexedDBService } from '../IndexedDBService';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('IndexedDBService', () => {
  let service: IndexedDBService;

  beforeEach(() => {
    service = new IndexedDBService();
    jest.clearAllMocks();
  });

  it('should initialize successfully', async () => {
    const mockDB = {
      objectStoreNames: { contains: jest.fn().mockReturnValue(false) },
      createObjectStore: jest.fn().mockReturnValue({
        createIndex: jest.fn(),
      }),
      transaction: jest.fn(),
    };

    const mockRequest = {
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      result: mockDB,
    };

    mockIndexedDB.open.mockReturnValue(mockRequest);

    // Simulate successful initialization
    setTimeout(() => {
      if (mockRequest.onsuccess) {
        mockRequest.onsuccess({ target: { result: mockDB } });
      }
    }, 0);

    await expect(service.healthCheck()).resolves.toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
    });
  });

  it('should handle initialization errors', async () => {
    const mockRequest = {
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      error: new Error('IndexedDB not supported'),
    };

    mockIndexedDB.open.mockReturnValue(mockRequest);

    // Simulate error
    setTimeout(() => {
      if (mockRequest.onerror) {
        mockRequest.onerror({ target: { error: mockRequest.error } });
      }
    }, 0);

    await expect(service.healthCheck()).rejects.toThrow('IndexedDB not supported');
  });
});
