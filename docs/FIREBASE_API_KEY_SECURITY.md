# Firebase / Google API Key Security

If you received a **"Publicly accessible Google API key"** alert from Google Cloud:

## What we fixed in the repo

- **Removed hardcoded API keys** from `migrate-surveys.html` and `fix-surveys.html`.  
  Those files now use placeholders. For local use, copy your config from Firebase Console or `.env.local` and **do not commit** real values.

- The main app correctly uses **environment variables** (`REACT_APP_FIREBASE_*`) from `.env.local` / `.env.production`, which are in `.gitignore` and not committed.

## What you should do in Google Cloud

Firebase Web API keys are meant to be used in client-side code (they get bundled in your app). To satisfy the alert and limit risk:

### 1. Restrict the API key (recommended)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select project **Provider Survey Aggregator** (id: `provider-survey-aggregator`).
2. Go to **APIs & Services** → **Credentials**.
3. Under **API Keys**, open the key used by your Firebase app (the one in your env / the one that was in the HTML files).
4. Under **Application restrictions**:
   - Choose **HTTP referrers (websites)**.
   - Add only your domains, e.g.:
     - `https://provider-survey-aggregator.web.app/*`
     - `https://provider-survey-aggregator.firebaseapp.com/*`
     - `http://localhost:*` (for local dev)
5. Under **API restrictions**:
   - Choose **Restrict key** and select only the APIs you use (e.g. **Firebase Authentication**, **Cloud Firestore API**).
6. Save.

After this, the key only works from those referrers and APIs, so it is no longer “unrestricted” and the alert should be addressed.

### 2. (Optional) Rotate the key

If the key was ever committed or shared:

1. In **APIs & Services** → **Credentials**, create a **new** API key.
2. Restrict the new key as above, then in Firebase: **Project settings** → **Your apps** → replace the Web API key with the new one.
3. Update `.env.local` and `.env.production` with the new key, rebuild and redeploy.
4. Delete or disable the old key in Google Cloud Console.

## References

- [Firebase: Restrict API keys](https://firebase.google.com/docs/projects/api-keys#restrict_api_keys)
- [Google Cloud: Securing API keys](https://cloud.google.com/docs/authentication/api-keys#securing_api_keys)
