/**
 * Client-side survey list filtering by provider type (DATA VIEW).
 * Extracted from useSurveyListQuery for reuse: single Firestore fetch, filter in UI.
 */

const isUploadDebugEnabled = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true';

/**
 * Filter surveys by provider type (BOTH / PHYSICIAN / APP / CALL / etc.).
 * BOTH or undefined = no filter, return all surveys.
 */
export function filterSurveysByProviderType<T extends { id?: string; name?: string; type?: string; providerType?: string; metadata?: { providerType?: string }; dataCategory?: string }>(
  surveys: T[],
  providerType?: string
): T[] {
  if (!surveys.length) return surveys;
  if (!providerType || providerType === 'BOTH') return surveys;

  const debugMode = isUploadDebugEnabled();
  const beforeCount = surveys.length;

  const filtered = surveys.filter((survey) => {
    const surveyProviderType = survey.providerType || survey.metadata?.providerType || 'PHYSICIAN';
    const surveyDataCategory = survey.dataCategory;

    const isCallPay: boolean = Boolean(
      surveyDataCategory === 'CALL_PAY' ||
      surveyProviderType === 'CALL' ||
      (survey.name && survey.name.toLowerCase().includes('call pay')) ||
      (survey.type && survey.type.toLowerCase().includes('call pay'))
    );

    let matches = false;

    if (providerType === 'CALL') {
      matches = isCallPay;
    } else if (providerType === 'PHYSICIAN') {
      const normalizedSurveyType = (surveyProviderType as string)?.toUpperCase().trim() || '';
      const isPhysician: boolean = Boolean(
        normalizedSurveyType === 'PHYSICIAN' ||
        normalizedSurveyType === 'STAFF PHYSICIAN' ||
        normalizedSurveyType === 'STAFFPHYSICIAN' ||
        normalizedSurveyType === 'PHYS' ||
        normalizedSurveyType.startsWith('PHYSICIAN') ||
        (!surveyProviderType &&
          survey.name &&
          (survey.name.toLowerCase().includes('physician') ||
            (survey.name.toLowerCase().includes('mgma') && !survey.name.toLowerCase().includes('app')) ||
            (survey.name.toLowerCase().includes('gallagher') && !survey.name.toLowerCase().includes('app')) ||
            (survey.name.toLowerCase().includes('sullivan') && !survey.name.toLowerCase().includes('app'))))
      );
      matches = isPhysician && !isCallPay;

      if (debugMode && survey.name && (survey.name.toLowerCase().includes('sullivan') || survey.name.toLowerCase().includes('physician'))) {
        console.log(`🔍 PHYSICIAN filter: Survey "${survey.name}" ${matches ? 'INCLUDED' : 'EXCLUDED'}:`, {
          surveyId: survey.id,
          providerType: surveyProviderType,
          normalized: normalizedSurveyType,
          isCallPay,
          isPhysician,
        });
      }
    } else if (providerType === 'APP') {
      const name = (survey.name || survey.type || '').toLowerCase();
      const type = (survey.type || survey.name || '').toLowerCase();
      const isClearlyPhysicianByName =
        (name.includes('physician') && !name.includes('app')) ||
        (type.includes('physician') && !type.includes('app'));
      const isStrictlyApp = (surveyProviderType as string)?.toUpperCase().trim() === 'APP' && !isCallPay;
      matches = isStrictlyApp && !isClearlyPhysicianByName;
    } else {
      matches = surveyProviderType === providerType;
    }

    if (debugMode) {
      const isSullivanPhysician =
        survey.name &&
        survey.name.toLowerCase().includes('sullivan') &&
        !survey.name.toLowerCase().includes('app') &&
        (providerType === 'PHYSICIAN' || surveyProviderType === 'PHYSICIAN');
      if (isSullivanPhysician || !matches) {
        console.log(`🔍 Provider filter: survey "${survey.name}" ${matches ? 'MATCHED' : 'EXCLUDED'}:`, {
          surveyId: survey.id,
          surveyProviderType,
          filterProviderType: providerType,
          isCallPay,
          matches,
        });
      }
    }

    return matches;
  });

  if (debugMode || filtered.length !== beforeCount) {
    console.log(`👥 filterSurveysByProviderType("${providerType}"): ${beforeCount} → ${filtered.length} surveys`);
  }
  if (debugMode && filtered.length === 0 && beforeCount > 0) {
    console.warn(`⚠️ No surveys matched provider type filter "${providerType}" - all ${beforeCount} surveys were filtered out`);
  }

  return filtered;
}
