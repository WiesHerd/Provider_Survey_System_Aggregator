# Storage Matrix

This document lists each screen and feature, where data is stored (Firebase Firestore, IndexedDB, or localStorage), and any intentional local-only or Firebase-only behavior.

**Storage mode**: When the user is signed in and Firebase is available, the app uses **Firebase** (Firestore) as the primary backend. Otherwise it uses **IndexedDB** (local browser). User preferences and some settings use **localStorage** as a fallback when not in Firebase mode.

---

## By data type

| Area | Firebase (when signed in) | IndexedDB (local) | localStorage | Notes |
|------|---------------------------|--------------------|--------------|--------|
| Surveys & survey data | Yes | Yes (fallback) | — | Primary in Firebase when in Firebase mode. |
| Specialty / column / variable / region / provider type mappings | Yes | Yes (fallback) | — | Routed through DataService. |
| Learned mappings | Yes | Yes (fallback) | — | Synced to Firebase when in Firebase mode. |
| Preferences (including report config) | Yes | — | Yes (fallback) | `preference_*` keys when not in Firebase mode. |
| Year config | Yes | — | Yes (fallback) | Stored via DataService preferences (`year_configs`). |
| Blend templates | Yes | Yes (fallback) | — | Specialty Blending screen. |
| Specialty mapping sources | Yes | Yes (fallback) | — | |
| Custom reports (Chart & Report Builder) | Yes | — | Yes (fallback) | When not in Firebase mode, reportStorage uses localStorage only. |
| FMV calculations | Yes | Yes (fallback) | — | Fair Market Value saved scenarios. |
| Audit logs | Yes | — | Yes (when not Firebase) | AuditLogService uses localStorage when not in Firebase mode. |
| Cache / upload intents | Yes | — | — | |
| APP specialty overrides | — | — | Yes | APPSpecialtyMappingService; local overrides only. |
| Upload queue | — | — | Yes | UploadQueueService; transient. |
| Upload form defaults / checkpoints / metrics | — | — | Yes | Transient or local convenience. |
| Error logs | — | — | Yes | ErrorLoggingService. |

---

## By screen / feature

| Screen or feature | Persisted data | Where stored | Notes |
|-------------------|-----------------|--------------|--------|
| **Dashboard** | None | — | Reads surveys/counts via DataService; no screen-specific storage. |
| **Upload (SurveyUpload)** | Surveys, survey data, upload intents, learned mappings (on apply) | Firebase or IndexedDB; learned mappings sync to Firebase when in Firebase mode | |
| **Specialty / Provider Type / Region / Variable mapping** | Mappings | Firebase or IndexedDB | All go through DataService. |
| **Benchmarking (SurveyAnalytics)** | None | — | Reads from DataService; no saved benchmark config. |
| **Regional Analytics** | None | — | Reads from DataService. |
| **Fair Market Value** | Saved FMV calculations | Firebase or IndexedDB | SavedFMVManager uses DataService. |
| **Chart & Report Builder (Custom Reports)** | Report configs | Firebase or localStorage (fallback) | reportStorage tries Firebase first, then localStorage. |
| **Canned Reports (Report Library)** | Report config per metric | DataService preferences (`reportConfig_${metric}`) | Firebase or localStorage. |
| **Specialty Blending** | Blend templates | Firebase or IndexedDB | |
| **System Settings** | Settings blob, “Clear all data” | Preferences (Firebase/localStorage); deleteAllUserData wipes active backend + local | Clear all data now performs full wipe (surveys, mappings, preferences, reports, FMV, blends). |

---

## Firestore collections (user-scoped)

Under `users/{userId}/`:

- `surveys` – Survey metadata
- `surveyData` – Survey data rows
- `uploadIntents` – Upload progress/rollback
- `specialtyMappings`, `columnMappings`, `variableMappings`, `regionMappings`, `providerTypeMappings`
- `learnedMappings` – ML-style mapping suggestions
- `preferences` – User preferences (including year config, report config)
- `auditLogs` – Audit trail
- `blendTemplates` – Specialty blending configs
- `specialtyMappingSources` – Source tracking for mappings
- `customReports` – Chart & Report Builder saved reports
- `fmvCalculations` – Saved FMV scenarios
- `cache` – Temporary cache

---

## Intentional behavior

- **Learned mappings**: Stored in Firebase when in Firebase mode (with IndexedDB fallback) so they can sync across devices.
- **Year config**: Stored via DataService preferences so it syncs to Firebase when in Firebase mode.
- **Custom reports**: When not in Firebase mode, only localStorage is used (no IndexedDB); custom reports effectively require sign-in for cloud persistence.
- **Clear all data**: Uses `DataService.deleteAllUserData()` to clear the active backend (Firebase when signed in) plus IndexedDB and app-scoped localStorage for a full wipe.
