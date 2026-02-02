/**
 * File list state for upload: files, add/remove/clear, validation results, sheet selection
 */

import { useState, useCallback, useEffect } from 'react';
import { FileWithPreview } from '../types/upload';
import { CompleteValidationResult } from '../types/validation';
import { parseFile } from '../utils/fileParser';
import { validateAll } from '../utils/validationEngine';
import { getExcelSheetNames } from '../utils/excelParser';
import { isExcelFile } from '../utils/fileParser';

const VALIDATION_DEBOUNCE_MS = 400;

export function useUploadFileList() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [validationResults, setValidationResults] = useState<Map<string, CompleteValidationResult>>(new Map());
  const [selectedSheets, setSelectedSheets] = useState<Map<string, string>>(new Map());
  const [excelSheetInfo, setExcelSheetInfo] = useState<Map<string, Array<{ name: string; rowCount: number; columnCount: number }>>>(new Map());

  const setSelectedSheet = useCallback((fileId: string, sheetName: string) => {
    setSelectedSheets(prev => {
      const next = new Map(prev);
      next.set(fileId, sheetName);
      return next;
    });
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const withPreview = newFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}`
    }));
    setFiles(prev => [...prev, ...withPreview]);
  }, []);

  const removeFile = useCallback((file: FileWithPreview) => {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    if (file.preview) URL.revokeObjectURL(file.preview);
    setValidationResults(prev => {
      const next = new Map(prev);
      next.delete(file.id!);
      return next;
    });
    setSelectedSheets(prev => {
      const next = new Map(prev);
      next.delete(file.id!);
      return next;
    });
    setExcelSheetInfo(prev => {
      const next = new Map(prev);
      next.delete(file.id!);
      return next;
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles(prev => {
      prev.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      return [];
    });
    setValidationResults(new Map());
    setSelectedSheets(new Map());
    setExcelSheetInfo(new Map());
  }, []);

  useEffect(() => {
    if (files.length === 0) {
      setValidationResults(new Map());
      return;
    }
    const timeoutId = setTimeout(async () => {
      for (const file of files) {
        if (!file.id) continue;
        try {
          const sheet = selectedSheets.get(file.id);
          const parsed = await parseFile(file, sheet);
          const result = validateAll(parsed.headers, parsed.rows);
          setValidationResults(prev => {
            const next = new Map(prev);
            next.set(file.id!, result);
            return next;
          });
        } catch {
          setValidationResults(prev => {
            const next = new Map(prev);
            next.set(file.id!, {
              tier1: { isValid: false, errors: [{ severity: 'critical', tier: 'tier1' as any, category: 'structure', message: 'Parse failed', fixInstructions: [] }], blocked: true },
              tier2: { isValid: true, warnings: [], blocked: false },
              tier3: { isValid: true, info: [], blocked: false },
              isValid: false,
              canProceed: false,
              totalIssues: 1,
              errorCount: 1,
              warningCount: 0,
              infoCount: 0
            });
            return next;
          });
        }
      }
    }, VALIDATION_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [files, selectedSheets]);

  useEffect(() => {
    return () => {
      files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, [files]);

  return {
    files,
    setFiles,
    addFiles,
    removeFile,
    clearFiles,
    validationResults,
    setValidationResults,
    selectedSheets,
    setSelectedSheet,
    excelSheetInfo,
    setExcelSheetInfo
  };
}
