/**
 * Staging Environment Configuration
 * 
 * This file is loaded in staging mode and provides
 * environment-specific overrides for staging deployments.
 * 
 * @see {@link file://../core/environment.js}
 */

export default {
  name: 'staging',
  logLevel: 'info',
  api: {
    baseURL: 'https://api-staging.harmony.dev'
  },
  features: {
    eventBusDebug: true,
    performanceMonitoring: true,
    componentGraph: true,
    experimentalFeatures: true
  }
};