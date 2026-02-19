/**
 * Production Environment Configuration
 * 
 * This file is loaded in production mode and provides
 * environment-specific overrides for production deployments.
 * 
 * @see {@link file://../core/environment.js}
 */

export default {
  name: 'production',
  logLevel: 'error',
  api: {
    baseURL: 'https://api.harmony.dev'
  },
  features: {
    eventBusDebug: false,
    performanceMonitoring: true,
    componentGraph: false,
    experimentalFeatures: false
  }
};