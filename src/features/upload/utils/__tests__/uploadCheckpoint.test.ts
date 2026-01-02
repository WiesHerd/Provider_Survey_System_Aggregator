/**
 * Tests for Upload Checkpoint System
 */

import {
  createCheckpoint,
  saveCheckpoint,
  getCheckpoint,
  getCheckpointsByState,
  deleteCheckpoint,
  markCheckpointCompleted,
  markCheckpointFailed,
  canResumeCheckpoint,
  getResumeData,
  cleanupOldCheckpoints
} from '../uploadCheckpoint';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Upload Checkpoint', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createCheckpoint', () => {
    it('should create new checkpoint', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test Survey',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: ['name', 'age']
      };

      const checkpoint = createCheckpoint(
        'upload_123',
        file,
        metadata,
        1000,
        10
      );

      expect(checkpoint.uploadId).toBe('upload_123');
      expect(checkpoint.fileName).toBe('test.csv');
      expect(checkpoint.totalRows).toBe(1000);
      expect(checkpoint.totalBatches).toBe(10);
      expect(checkpoint.state).toBe('in_progress');
    });
  });

  describe('saveCheckpoint and getCheckpoint', () => {
    it('should save and retrieve checkpoint', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: []
      };

      const checkpoint = createCheckpoint('upload_123', file, metadata, 100, 5);
      saveCheckpoint(checkpoint);

      const retrieved = getCheckpoint('upload_123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.uploadId).toBe('upload_123');
    });
  });

  describe('markCheckpointCompleted', () => {
    it('should mark checkpoint as completed', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: []
      };

      const checkpoint = createCheckpoint('upload_123', file, metadata, 100, 5);
      markCheckpointCompleted('upload_123');

      const updated = getCheckpoint('upload_123');
      expect(updated?.state).toBe('completed');
      expect(updated?.rowsProcessed).toBe(100);
    });
  });

  describe('markCheckpointFailed', () => {
    it('should mark checkpoint as failed with error', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: []
      };

      createCheckpoint('upload_123', file, metadata, 100, 5);
      markCheckpointFailed('upload_123', {
        message: 'Test error',
        type: 'network',
        recoverable: true
      });

      const updated = getCheckpoint('upload_123');
      expect(updated?.state).toBe('failed');
      expect(updated?.error).toBeDefined();
      expect(updated?.error?.recoverable).toBe(true);
    });
  });

  describe('canResumeCheckpoint', () => {
    it('should return true for failed recoverable checkpoint', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: []
      };

      createCheckpoint('upload_123', file, metadata, 100, 5);
      markCheckpointFailed('upload_123', {
        message: 'Test error',
        type: 'network',
        recoverable: true
      });

      const checkpoint = getCheckpoint('upload_123');
      expect(checkpoint).not.toBeNull();
      expect(canResumeCheckpoint(checkpoint!)).toBe(true);
    });

    it('should return false for completed checkpoint', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: []
      };

      createCheckpoint('upload_123', file, metadata, 100, 5);
      markCheckpointCompleted('upload_123');

      const checkpoint = getCheckpoint('upload_123');
      expect(checkpoint).not.toBeNull();
      expect(canResumeCheckpoint(checkpoint!)).toBe(false);
    });
  });

  describe('getResumeData', () => {
    it('should return correct resume data', () => {
      const file = new File(['test'], 'test.csv');
      const metadata = {
        surveyName: 'Test',
        surveyYear: 2024,
        surveyType: 'MGMA',
        providerType: 'PHYSICIAN',
        headers: []
      };

      const checkpoint = createCheckpoint('upload_123', file, metadata, 100, 10);
      checkpoint.rowsProcessed = 50;
      checkpoint.lastBatchIndex = 4;
      saveCheckpoint(checkpoint);

      const resumeData = getResumeData(checkpoint);
      expect(resumeData.startRowIndex).toBe(50);
      expect(resumeData.startBatchIndex).toBe(5);
      expect(resumeData.rowsRemaining).toBe(50);
    });
  });
});
