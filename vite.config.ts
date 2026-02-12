
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env vars regardless of the `VITE_` prefix.
  // Use '.' instead of process.cwd() to resolve TypeScript error in standard configuration environments.
  const env = loadEnv(mode, '.', '');
  
  // Support both common naming conventions
  const apiKey = env.API_KEY || env.GEMINI_API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // Ensure the key is stringified correctly for replacement
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Shim process.env for general compatibility
      'process.env': {
        API_KEY: JSON.stringify(apiKey)
      }
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});
