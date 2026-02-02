/**
 * Form state for upload: survey type, year, provider type, smart defaults
 */

import { useState, useCallback } from 'react';
import { UploadFormState } from '../types/upload';
import { getSmartDefaults } from '../utils/autoDetection';

export interface UseUploadFormStateOptions {
  currentYear?: string;
  selectedProviderType?: string;
}

export function useUploadFormState(options: UseUploadFormStateOptions = {}) {
  const { currentYear = '', selectedProviderType = '' } = options;

  const [formState, setFormState] = useState<UploadFormState>(() => {
    const defaults = getSmartDefaults();
    return {
      surveyType: defaults.surveySource || '',
      customSurveyType: '',
      surveyYear: defaults.surveyYear || currentYear || '',
      providerType: defaults.providerType || selectedProviderType || '',
      isCustom: false
    };
  });

  const updateFormState = useCallback((field: keyof UploadFormState, value: unknown) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleCustom = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      isCustom: !prev.isCustom,
      surveyType: prev.isCustom ? prev.surveyType : '',
      customSurveyType: prev.isCustom ? '' : prev.customSurveyType
    }));
  }, []);

  return { formState, setFormState, updateFormState, toggleCustom };
}
