# Firebase Upload & Sync Testing Checklist

**CRITICAL: Complete this checklist BEFORE loading production data**

Test each item and check it off. Document any issues encountered.

---

## Pre-Testing Setup

- [ ] **Environment Variables Configured**
  - [ ] `REACT_APP_FIREBASE_API_KEY` set in `.env.local`
  - [ ] `REACT_APP_FIREBASE_AUTH_DOMAIN` set
  - [ ] `REACT_APP_FIREBASE_PROJECT_ID` set
  - [ ] `REACT_APP_FIREBASE_STORAGE_BUCKET` set
  - [ ] `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` set
  - [ ] `REACT_APP_FIREBASE_APP_ID` set
  - [ ] `REACT_APP_RECAPTCHA_SITE_KEY` set (for App Check)
  - [ ] `REACT_APP_APPCHECK_DEBUG_TOKEN` set (for development)
  - [ ] `REACT_APP_STORAGE_MODE=firebase` set (for cloud-first mode)

- [ ] **Firebase Console Setup**
  - [ ] Firebase project created
  - [ ] Authentication enabled (Email/Password)
  - [ ] Firestore database created
  - [ ] Firestore security rules deployed
  - [ ] App Check enabled with reCAPTCHA v3
  - [ ] Billing enabled (if required for quotas)

- [ ] **Development Environment**
  - [ ] `npm install` completed without errors
  - [ ] `npm start` runs successfully
  - [ ] Browser console shows no configuration errors
  - [ ] Firebase initialized successfully (check console logs)

---

## Authentication Tests

### Sign Up Tests
- [ ] **New Account Creation**
  - [ ] Can create new account with valid email/password
  - [ ] Email verification sent automatically
  - [ ] Error shown for invalid email format
  - [ ] Error shown for weak password (<6 characters)
  - [ ] Error shown for existing email

- [ ] **Sign In Tests**
  - [ ] Can sign in with valid credentials
  - [ ] Error shown for wrong password
  - [ ] Error shown for non-existent account
  - [ ] Session persists after page refresh
  - [ ] Can sign out successfully

### Session Management
- [ ] **Token Handling**
  - [ ] Fresh token obtained on sign-in
  - [ ] App doesn't break when token expires (auto-refresh)
  - [ ] Graceful error if auth expires during operation

---

## Upload Tests

### Happy Path - Small File (< 1MB, ~100 rows)

- [ ] **Pre-Upload Health Check**
  - [ ] Health check runs before upload
  - [ ] Firebase connectivity verified
  - [ ] Authentication status validated
  - [ ] Storage quota checked

- [ ] **File Upload**
  - [ ] CSV file uploads successfully
  - [ ] Excel file uploads successfully
  - [ ] Progress bar shows accurate progress (0-100%)
  - [ ] Progress messages update correctly
  - [ ] Upload completes in reasonable time (< 30 seconds)

- [ ] **Post-Upload Verification**
  - [ ] Survey appears in survey list immediately
  - [ ] Survey metadata correct (name, year, type, provider type)
  - [ ] Row count matches uploaded file
  - [ ] Data retrieved correctly from Firebase
  - [ ] Analytics calculations work with uploaded data

- [ ] **Cache Behavior**
  - [ ] Survey shows immediately (optimistic update)
  - [ ] Cache revalidates after 3 seconds
  - [ ] No stale data shown after revalidation

### Happy Path - Medium File (1-5MB, ~1000 rows)

- [ ] **File Upload**
  - [ ] Upload completes successfully
  - [ ] Progress updates smoothly
  - [ ] No timeout errors
  - [ ] Data integrity verified

### Happy Path - Large File (5-10MB, ~10,000 rows)

- [ ] **File Upload**
  - [ ] Upload completes successfully
  - [ ] Batch writes handled correctly (500 rows per batch)
  - [ ] No memory issues
  - [ ] Progress tracking accurate for large files

---

## Error Scenario Tests

### Network Errors

- [ ] **Network Disconnection Mid-Upload**
  - [ ] Error detected gracefully
  - [ ] Rollback triggered automatically
  - [ ] No partial data left in Firebase
  - [ ] User-friendly error message shown
  - [ ] Can retry upload after reconnecting

- [ ] **Slow Network**
  - [ ] Upload completes (may be slow but doesn't timeout)
  - [ ] Progress updates continue showing
  - [ ] No data corruption

### Authentication Errors

- [ ] **Session Expires During Upload**
  - [ ] Error caught gracefully
  - [ ] Rollback triggered
  - [ ] User prompted to sign in again
  - [ ] Can retry after signing in

- [ ] **Upload Without Authentication**
  - [ ] Error shown before upload starts
  - [ ] User redirected to sign-in

### Storage Quota Errors

- [ ] **Quota Exceeded (if testable)**
  - [ ] Clear error message shown
  - [ ] Explains Firebase quota limits
  - [ ] Suggests upgrade or wait for reset
  - [ ] No data corruption

### Validation Errors

- [ ] **Invalid CSV Format**
  - [ ] Validation errors shown before upload
  - [ ] Specific issues highlighted
  - [ ] No upload attempted

- [ ] **Empty File**
  - [ ] Error shown immediately
  - [ ] Clear message about file being empty

- [ ] **Missing Required Columns**
  - [ ] Validation catches missing columns
  - [ ] Lists which columns are required

### Duplicate Upload

- [ ] **Same Survey Twice**
  - [ ] Warning or prevention of duplicate
  - [ ] Or: second upload overwrites first (document behavior)

---

## Data Integrity Tests

### Row Count Verification

- [ ] **Upload Verification**
  - [ ] Verification runs after upload
  - [ ] Retry logic works for eventual consistency
  - [ ] Fails if row count doesn't match
  - [ ] Triggers rollback on verification failure

### Sample Data Verification

- [ ] **Data Integrity Check**
  - [ ] First row matches original
  - [ ] Middle row matches original
  - [ ] Last row matches original
  - [ ] Key fields (specialty, providerType, variable) preserved

### Metadata Verification

- [ ] **Survey Metadata**
  - [ ] Row count in metadata matches actual
  - [ ] Specialty count accurate
  - [ ] Data points count accurate
  - [ ] Year stored correctly (as string)
  - [ ] Provider type stored correctly

---

## Rollback Tests

### Automatic Rollback

- [ ] **Upload Failure Triggers Rollback**
  - [ ] Survey metadata deleted
  - [ ] All data rows deleted
  - [ ] Upload intent marked as rolled back
  - [ ] Caches invalidated
  - [ ] No orphaned data in Firebase

- [ ] **Partial Upload Cleanup**
  - [ ] If survey created but data fails, both deleted
  - [ ] Upload intent tracked correctly
  - [ ] Can retry upload after rollback

---

## Data Retrieval Tests

### Survey List

- [ ] **Get All Surveys**
  - [ ] All surveys load correctly
  - [ ] Metadata complete for each survey
  - [ ] Upload dates correct
  - [ ] Filter by year works
  - [ ] Filter by provider type works

### Survey Data

- [ ] **Get Survey Data**
  - [ ] All rows retrieved correctly
  - [ ] Filtering by specialty works
  - [ ] Filtering by provider type works
  - [ ] Filtering by region works
  - [ ] Pagination works (if implemented)

### Performance

- [ ] **Large Dataset Retrieval**
  - [ ] 10,000 rows retrieved without timeout
  - [ ] Memory usage acceptable
  - [ ] UI remains responsive

---

## Delete Tests

### Single Survey Delete

- [ ] **Delete Survey**
  - [ ] Survey deleted from Firebase
  - [ ] All data rows deleted
  - [ ] Survey removed from list immediately
  - [ ] Verification confirms deletion
  - [ ] No orphaned data

### Cascade Delete

- [ ] **Related Data Cleanup**
  - [ ] Survey data rows deleted
  - [ ] Related mappings cleaned up (if applicable)
  - [ ] Caches invalidated

---

## Edge Cases

### Browser Actions

- [ ] **Page Refresh During Upload**
  - [ ] Upload state lost (expected)
  - [ ] No partial data (rollback occurred or data is complete)
  - [ ] Can start new upload after refresh

- [ ] **Browser Tab Close During Upload**
  - [ ] Upload interrupted
  - [ ] Next session: either data complete or rolled back (no partial)

### Multiple Uploads

- [ ] **Sequential Uploads**
  - [ ] Can upload multiple surveys one after another
  - [ ] Each tracked independently
  - [ ] No conflicts between uploads

### Concurrent Sessions

- [ ] **Same User, Different Devices**
  - [ ] Data syncs across devices
  - [ ] No conflicts
  - [ ] Latest data shown

---

## Performance Tests

### Upload Speed

- [ ] **1MB file**: Completes in < 10 seconds
- [ ] **5MB file**: Completes in < 30 seconds
- [ ] **10MB file**: Completes in < 60 seconds

### Retrieval Speed

- [ ] **Survey list**: Loads in < 2 seconds
- [ ] **1,000 rows**: Loads in < 3 seconds
- [ ] **10,000 rows**: Loads in < 10 seconds

### Memory Usage

- [ ] **Upload 10MB file**: No memory leaks
- [ ] **Load 10,000 rows**: Browser doesn't freeze
- [ ] **Multiple operations**: Memory released properly

---

## Security Tests

### App Check

- [ ] **App Check Enforced (Production)**
  - [ ] App Check token required for Firestore requests
  - [ ] Requests fail without valid token
  - [ ] Debug token works in development

### Data Isolation

- [ ] **User A Cannot Access User B Data**
  - [ ] Create accounts for User A and User B
  - [ ] Upload survey as User A
  - [ ] Sign in as User B
  - [ ] Confirm User B cannot see User A's survey
  - [ ] Firestore security rules enforced

### Authentication Required

- [ ] **Unauthenticated Access Blocked**
  - [ ] Sign out
  - [ ] Try to upload (should fail)
  - [ ] Try to view surveys (should fail)
  - [ ] Redirected to sign-in

---

## Cloud-First with Backup Tests

### Dual-Write Verification

- [ ] **Firebase + IndexedDB**
  - [ ] Upload to Firebase succeeds
  - [ ] Data automatically cached to IndexedDB
  - [ ] IndexedDB cache matches Firebase data

### Fallback Behavior

- [ ] **Firebase Unavailable**
  - [ ] Disconnect internet
  - [ ] Upload falls back to IndexedDB
  - [ ] Data stored locally
  - [ ] Reconnect: can sync to Firebase (if sync feature implemented)

---

## User Experience Tests

### Error Messages

- [ ] **All Error Messages User-Friendly**
  - [ ] No technical jargon shown to user
  - [ ] Clear actionable steps
  - [ ] No stack traces visible (development only)

### Loading States

- [ ] **Loading Indicators**
  - [ ] Show during upload
  - [ ] Show during data fetch
  - [ ] Show during delete
  - [ ] Never show indefinitely (timeout handling)

### Success Feedback

- [ ] **Success Messages**
  - [ ] Upload success toast/notification
  - [ ] Delete success notification
  - [ ] Clear success indicators

---

## Final Verification

Before loading production data:

- [ ] **All Critical Tests Passed**
  - [ ] Happy path works perfectly
  - [ ] Error scenarios handled gracefully
  - [ ] Data integrity verified
  - [ ] Rollback works correctly

- [ ] **Test with Real Survey Files**
  - [ ] Upload actual MGMA survey file
  - [ ] Upload actual SullivanCotter survey file
  - [ ] Verify data formats match expected
  - [ ] Analytics work with real data

- [ ] **User Acceptance**
  - [ ] Admin tests upload flow
  - [ ] Admin verifies data accuracy
  - [ ] Admin approves for production use

---

## Production Deployment Checklist

- [ ] **Environment Variables Set in Production**
  - [ ] All Firebase keys configured
  - [ ] App Check site key set (NOT debug token)
  - [ ] Storage mode set to `firebase`

- [ ] **Firebase Console**
  - [ ] Production project created (separate from development)
  - [ ] Security rules deployed
  - [ ] App Check enforced
  - [ ] Billing configured

- [ ] **Monitoring**
  - [ ] Error logging enabled
  - [ ] Upload metrics tracked
  - [ ] Alert for quota limits

- [ ] **Backup Strategy**
  - [ ] Regular Firebase exports scheduled (if needed)
  - [ ] Backup of critical data

---

## Testing Notes

**Date:** ___________  
**Tester:** ___________  
**Environment:** ☐ Development  ☐ Staging  ☐ Production

**Issues Found:**
```
[Document any issues encountered during testing]
```

**Test Results Summary:**
- Total Tests: _____
- Passed: _____
- Failed: _____
- Skipped: _____

**Approval:**
- [ ] All critical tests passed
- [ ] Issues documented and triaged
- [ ] Ready for production data load

**Approved By:** ___________ **Date:** ___________

---

**REMEMBER:** Do NOT load production data until ALL critical tests pass!
