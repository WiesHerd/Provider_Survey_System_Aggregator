/**
 * Environment Variable Validation
 * 
 * Validates required environment variables on app startup.
 * Fails gracefully with clear error messages.
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * Environment variable configurations
 */
const envVarConfigs: EnvVarConfig[] = [
  {
    name: 'REACT_APP_FIREBASE_API_KEY',
    required: false, // Optional - app can work without Firebase
    description: 'Firebase API Key for authentication',
  },
  {
    name: 'REACT_APP_FIREBASE_AUTH_DOMAIN',
    required: false,
    description: 'Firebase Auth Domain',
  },
  {
    name: 'REACT_APP_FIREBASE_PROJECT_ID',
    required: false,
    description: 'Firebase Project ID',
  },
  {
    name: 'REACT_APP_FIREBASE_STORAGE_BUCKET',
    required: false,
    description: 'Firebase Storage Bucket',
  },
  {
    name: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    required: false,
    description: 'Firebase Messaging Sender ID',
  },
  {
    name: 'REACT_APP_FIREBASE_APP_ID',
    required: false,
    description: 'Firebase App ID',
  },
  {
    name: 'REACT_APP_STORAGE_MODE',
    required: false,
    description: 'Storage mode (indexeddb or firebase)',
    validator: (value) => ['indexeddb', 'firebase'].includes(value.toLowerCase()),
    errorMessage: 'Must be either "indexeddb" or "firebase"',
  },
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all environment variables
 * 
 * @returns Validation result with errors and warnings
 */
export const validateEnvironmentVariables = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  envVarConfigs.forEach((config) => {
    const value = process.env[config.name];

    if (config.required && !value) {
      errors.push(`Required environment variable ${config.name} is missing: ${config.description}`);
      return;
    }

    if (value && config.validator && !config.validator(value)) {
      const errorMsg = config.errorMessage || `Invalid value for ${config.name}`;
      errors.push(`${config.name}: ${errorMsg}`);
    }
  });

  // Check if Firebase is partially configured (some vars but not all)
  const firebaseVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID',
  ];

  const firebaseVarCount = firebaseVars.filter(
    (varName) => !!process.env[varName]
  ).length;

  if (firebaseVarCount > 0 && firebaseVarCount < firebaseVars.length) {
    warnings.push(
      `Firebase is partially configured (${firebaseVarCount}/${firebaseVars.length} variables). Some features may not work correctly.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate environment variables and log results
 * 
 * @param showWarnings - Whether to show warnings (default: true)
 * @returns True if validation passed
 */
export const validateAndLog = (showWarnings: boolean = true): boolean => {
  const result = validateEnvironmentVariables();

  if (result.errors.length > 0) {
    console.error('❌ Environment Variable Validation Failed:');
    result.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    return false;
  }

  if (showWarnings && result.warnings.length > 0) {
    console.warn('⚠️ Environment Variable Warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }

  if (result.isValid && process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
  }

  return result.isValid;
};

/**
 * Get environment variable with validation
 * 
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 * @returns Environment variable value or default
 */
export const getEnvVar = (name: string, defaultValue?: string): string | undefined => {
  return process.env[name] || defaultValue;
};

/**
 * Require environment variable (throws if missing)
 * 
 * @param name - Environment variable name
 * @returns Environment variable value
 * @throws Error if variable is missing
 */
export const requireEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
};



