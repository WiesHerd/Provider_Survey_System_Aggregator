/**
 * Survey display formatting utilities
 * Formats surveys using the new structure: [Source] [Data Category] - [Provider Type]
 */

/**
 * Format survey display name using new structure: [Source] [Data Category] - [Provider Type]
 * Supports both new architecture (source + dataCategory) and old structure (type field)
 */
export const getSurveyDisplayName = (survey: any): string => {
  // NEW: Use survey.source and survey.dataCategory if available (new architecture)
  if (survey.source && survey.dataCategory) {
    const source = survey.source;
    const dataCategory = survey.dataCategory;
    const providerType = survey.providerType;
    
    // Format data category display
    const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay'
      : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
      : dataCategory === 'COMPENSATION' ? (providerType === 'APP' ? 'APP' : 'Physician')
      : dataCategory === 'CUSTOM' ? (survey.customDataCategory || 'Custom')
      : dataCategory;
    
    // Format provider type display
    const providerDisplay = providerType === 'PHYSICIAN' ? 'Physician'
      : providerType === 'APP' ? 'APP'
      : providerType === 'CUSTOM' ? (survey.customProviderType || 'Custom')
      : '';
    
    // Include survey label if provided (e.g., "Pediatrics", "Adult Medicine")
    const labelSuffix = (survey.surveyLabel || survey.metadata?.surveyLabel) 
      ? ` - ${survey.surveyLabel || survey.metadata?.surveyLabel}` 
      : '';
    
    // Construct display name: "Source DataCategory - ProviderType - Label"
    if (providerDisplay && categoryDisplay !== providerDisplay) {
      return `${source} ${categoryDisplay} - ${providerDisplay}${labelSuffix}`;
    } else {
      return `${source} ${categoryDisplay}${labelSuffix}`;
    }
  }
  
  // BACKWARD COMPATIBILITY: Use old structure (survey.type)
  const surveyType = survey.type || survey.name || '';
  const providerType = survey.providerType;
  
  if (!surveyType) {
    return 'Unknown Survey';
  }
  
  // Handle custom survey types
  if (surveyType === 'CUSTOM' || surveyType.toLowerCase().includes('custom')) {
    return 'Custom Survey';
  }
  
  // For old structure, try to extract meaningful display
  if (providerType === 'CALL') {
    // Ensure Call Pay is shown
    if (surveyType.includes('Call Pay')) {
      return surveyType;
    } else if (surveyType.includes('Physician')) {
      return surveyType.replace('Physician', 'Call Pay');
    } else {
      return `${surveyType} Call Pay`;
    }
  }
  
  return surveyType;
};

/**
 * Get shortened survey type for compact displays (tabs, pills)
 * Returns just Source + Data Category without provider type
 */
export const getShortenedSurveyType = (survey: any): string => {
  // If full survey object is available, use new display logic
  if (survey && survey.source) {
    const source = survey.source;
    const dataCategory = survey.dataCategory;
    const categoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay'
      : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
      : dataCategory === 'COMPENSATION' ? (survey.providerType === 'APP' ? 'APP' : 'Physician')
      : dataCategory === 'CUSTOM' ? 'Custom'
      : dataCategory;
    return `${source} ${categoryDisplay}`;
  }
  
  // BACKWARD COMPATIBILITY: Old logic for surveys without new structure
  const surveyType = survey.surveyType || survey.type || '';
  const providerType = survey.providerType;
  
  if (surveyType === 'CUSTOM' || surveyType.toLowerCase().includes('custom')) {
    return 'Custom';
  }
  
  let shortenedType = surveyType;
  
  if (providerType === 'CALL') {
    if (surveyType.includes('Physician')) {
      shortenedType = surveyType.replace('Physician', 'Call Pay');
    } else if (!surveyType.includes('Call Pay')) {
      shortenedType = `${surveyType} Call Pay`;
    }
  } else if (providerType === 'PHYSICIAN') {
    shortenedType = surveyType.replace('Physician', '').replace('Call Pay', 'Physician').trim();
    if (!shortenedType.toLowerCase().includes('physician')) {
      shortenedType = shortenedType ? `${shortenedType} Physician` : 'Physician';
    }
  } else if (providerType === 'APP') {
    shortenedType = surveyType.replace('APP', ' - APP');
  }
  
  return shortenedType;
};

