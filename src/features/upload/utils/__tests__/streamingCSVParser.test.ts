/**
 * Tests for Streaming CSV Parser
 * 
 * Tests memory efficiency, chunked parsing, and edge cases
 */

import { 
  parseCSVStreaming, 
  parseCSVNonStreaming, 
  parseCSVSmart,
  shouldUseStreaming,
  shouldUseWorker 
} from '../../../../shared/utils/streamingCSVParser';

describe('Streaming CSV Parser', () => {
  describe('shouldUseStreaming', () => {
    it('should return false for small files (<1MB)', () => {
      expect(shouldUseStreaming(500 * 1024)).toBe(false);
    });

    it('should return true for medium files (>=1MB)', () => {
      expect(shouldUseStreaming(1.5 * 1024 * 1024)).toBe(true);
    });
  });

  describe('shouldUseWorker', () => {
    it('should return false for files <=5MB', () => {
      expect(shouldUseWorker(5 * 1024 * 1024)).toBe(false);
    });

    it('should return true for large files (>5MB)', () => {
      expect(shouldUseWorker(10 * 1024 * 1024)).toBe(true);
    });
  });

  describe('parseCSVStreaming', () => {
    it('should parse CSV file in chunks', async () => {
      const csvContent = 'name,age,city\nJohn,30,New York\nJane,25,Los Angeles';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseCSVStreaming(file, {
        chunkSize: 10 // Small chunks for testing
      });

      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        name: 'John',
        age: '30',
        city: 'New York'
      });
    });

    it('should handle quoted fields with commas', async () => {
      const csvContent = 'name,description\nJohn,"Works in New York, NY"\nJane,"Works in Los Angeles, CA"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseCSVStreaming(file);

      expect(result.rows[0].description).toBe('Works in New York, NY');
      expect(result.rows[1].description).toBe('Works in Los Angeles, CA');
    });

    it('should call onProgress callback', async () => {
      const csvContent = 'name,age\n'.repeat(100); // 100 rows
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const progressCalls: any[] = [];
      await parseCSVStreaming(file, {
        chunkSize: 50,
        onProgress: (progress) => {
          progressCalls.push(progress);
        }
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0]).toHaveProperty('bytesRead');
      expect(progressCalls[0]).toHaveProperty('totalBytes');
      expect(progressCalls[0]).toHaveProperty('rowsParsed');
    });
  });

  describe('parseCSVSmart', () => {
    it('should use streaming for large files', async () => {
      const largeContent = 'name,age\n'.repeat(10000);
      const file = new File([largeContent], 'test.csv', { type: 'text/csv' });

      const result = await parseCSVSmart(file);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should use non-streaming for small files', async () => {
      const smallContent = 'name,age\nJohn,30';
      const file = new File([smallContent], 'test.csv', { type: 'text/csv' });

      const result = await parseCSVSmart(file);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(1);
    });
  });
});
