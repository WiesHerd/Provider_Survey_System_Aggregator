const { execSync } = require('child_process');

// Set environment variables to disable ESLint
process.env.CI = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.GENERATE_SOURCEMAP = 'true'; // Temporarily enable for debugging

console.log('Building for Vercel with ESLint disabled...');
console.log('Environment variables:');
console.log('CI:', process.env.CI);
console.log('DISABLE_ESLINT_PLUGIN:', process.env.DISABLE_ESLINT_PLUGIN);
console.log('GENERATE_SOURCEMAP:', process.env.GENERATE_SOURCEMAP);

try {
  execSync('npx react-scripts build', { 
    stdio: 'inherit',
    env: process.env
  });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
