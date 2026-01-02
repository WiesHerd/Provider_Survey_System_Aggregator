/**
 * Tests for Data Integrity Verification
 */

import {
  calculateCRC32,
  calculateRowChecksum,
  calculateRowsChecksum,
  verifyUploadIntegrity,
  verifyRowCount,
  calculateDataStatistics
} from '../dataIntegrity';

describe('Data Integrity', () => {
  describe('calculateCRC32', () => {
    it('should calculate consistent checksums', () => {
      const data = 'test data';
      const checksum1 = calculateCRC32(data);
      const checksum2 = calculateCRC32(data);
      
      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should produce different checksums for different data', () => {
      const checksum1 = calculateCRC32('data1');
      const checksum2 = calculateCRC32('data2');
      
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('calculateRowChecksum', () => {
    it('should calculate checksum for row', () => {
      const row = { name: 'John', age: '30', city: 'NYC' };
      const checksum = calculateRowChecksum(row);
      
      expect(checksum).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should produce same checksum regardless of key order', () => {
      const row1 = { name: 'John', age: '30' };
      const row2 = { age: '30', name: 'John' };
      
      expect(calculateRowChecksum(row1)).toBe(calculateRowChecksum(row2));
    });
  });

  describe('verifyUploadIntegrity', () => {
    it('should verify matching data', async () => {
      const original = [
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' }
      ];
      const saved = [
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' }
      ];

      const result = await verifyUploadIntegrity(original, saved);

      expect(result.isValid).toBe(true);
      expect(result.rowCountMatch).toBe(true);
      expect(result.checksumMatch).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect row count mismatch', async () => {
      const original = [
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' }
      ];
      const saved = [
        { name: 'John', age: '30' }
      ];

      const result = await verifyUploadIntegrity(original, saved);

      expect(result.isValid).toBe(false);
      expect(result.rowCountMatch).toBe(false);
      expect(result.issues.some(i => i.type === 'row_count_mismatch')).toBe(true);
    });

    it('should detect checksum mismatch', async () => {
      const original = [
        { name: 'John', age: '30' }
      ];
      const saved = [
        { name: 'John', age: '31' } // Different age
      ];

      const result = await verifyUploadIntegrity(original, saved, {
        verifyChecksum: true
      });

      expect(result.isValid).toBe(false);
      expect(result.checksumMatch).toBe(false);
    });
  });

  describe('verifyRowCount', () => {
    it('should verify matching row counts', () => {
      const result = verifyRowCount(100, 100);
      expect(result.isValid).toBe(true);
    });

    it('should detect mismatched row counts', () => {
      const result = verifyRowCount(100, 99);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('mismatch');
    });
  });

  describe('calculateDataStatistics', () => {
    it('should calculate statistics for data', () => {
      const rows = [
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
        { name: 'Bob', age: '35' }
      ];

      const stats = calculateDataStatistics(rows);

      expect(stats.rowCount).toBe(3);
      expect(stats.columnCount).toBe(2);
      expect(stats.checksum).toMatch(/^[0-9a-f]{8}$/);
      expect(stats.sampleRows).toHaveLength(3);
    });
  });
});
