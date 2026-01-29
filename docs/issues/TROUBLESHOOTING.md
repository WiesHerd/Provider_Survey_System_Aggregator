# Troubleshooting Guide

## Common Issues and Resolutions

### 0.1 Firebase Hosting Blank Screen After Deploy

#### Problem
On `*.web.app` or `*.firebaseapp.com`, the page goes blank after a hard refresh and the console shows:
- `Uncaught SyntaxError: Unexpected token '<'` (from `main.*.js`)
- `WebSocket connection to 'ws://localhost:8081' failed`
- `X-Frame-Options may only be set via an HTTP header`

#### Root Cause
The browser is serving a **stale cached bundle or service worker** from a previous build. The JS request returns `index.html` (HTML), which triggers `Unexpected token '<'`. The `localhost:8081` websocket indicates a cached dev bundle, not a production build.

#### Solution
1. **Disable service worker registration** in production and force unregister on startup in `src/index.tsx` (prevents stale bundle caching).
2. **Disable the service worker** by replacing `public/sw.js` with a no-cache/unregistering version.
3. **Redeploy** Firebase Hosting.
4. **Clear site data** once in the browser (Application → Clear Storage → Clear site data).

This ensures fresh bundles load after each deploy and eliminates the `Unexpected token '<'` and dev websocket errors.

### 0. Variables Not Showing in Benchmarking Screen

#### Problem
Only TCC, wRVU, and CF variables are visible. Other variables (Base Salary, Call Pay, etc.) are missing.

#### Root Cause
The benchmarking screen was using the old `getAnalyticsData()` method which only processes three variables.

#### Solution
See [Variable Processing Critical Fix](VARIABLE_PROCESSING_CRITICAL_FIX.md) for complete details.

**Quick Fix**: Ensure `useBenchmarkingQuery` uses `getAnalyticsDataByVariables()` instead of `getAnalyticsData()`.

## Common Issues and Resolutions

### 1. Material-UI (MUI) Type Definition Issues

#### Problem
```
ERROR: Cannot find module '@mui/material' or its corresponding type declarations.
```

#### Root Cause
- Incomplete or incorrect installation of Material-UI dependencies
- Missing peer dependencies
- Version mismatch between packages

#### Solution
1. Clean existing node_modules:
```bash
rm -r -fo node_modules
```

2. Reinstall all dependencies:
```bash
npm install
```

3. Install specific MUI packages and their peer dependencies:
```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

### 2. Build Process Failures

#### Problem
Multiple module resolution errors:
- Missing webpack loaders
- Missing React refresh plugin
- Missing HTML webpack plugin

#### Root Cause
- Incomplete installation of development dependencies
- Corrupted node_modules cache
- Missing core React dependencies

#### Solution
1. Clear npm cache:
```bash
npm cache clean --force
```

2. Reinstall react-scripts:
```bash
npm install react-scripts
```

3. Ensure all core dependencies are installed:
```bash
npm install react react-dom @types/react @types/react-dom
```

### 3. Development Server Issues

#### Problem
```
Error: ENOENT: no such file or directory, stat '[path]\.cache\default-development\0.pack'
```

#### Root Cause
- Corrupted webpack cache
- Incomplete build process
- File permission issues

#### Solution
1. Delete the development cache:
```bash
rm -r -fo node_modules/.cache
```

2. Rebuild the application:
```bash
npm run build
```

3. Start the development server:
```bash
npm start
```

## Best Practices for Dependency Management

1. **Version Control**
   - Always specify exact versions in package.json
   - Use package-lock.json for consistent installations
   - Commit both package.json and package-lock.json

2. **Installation Process**
   - Use clean installs when encountering issues
   - Install peer dependencies explicitly
   - Verify node and npm versions match the project requirements

3. **Maintenance**
   - Regularly update dependencies
   - Keep development dependencies separate from production dependencies
   - Document any specific version requirements or conflicts

## Prevention Steps

1. Before starting development:
   - Verify node.js version compatibility
   - Install all required dependencies
   - Check for peer dependency warnings

2. When adding new packages:
   - Review peer dependency requirements
   - Test in a clean environment
   - Document any special installation steps

3. Regular maintenance:
   - Clean node_modules periodically
   - Update packages systematically
   - Maintain documentation of known issues

## Support Resources

- [Material-UI Documentation](https://mui.com/material-ui/getting-started/installation/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Create React App Documentation](https://create-react-app.dev/docs/getting-started) 