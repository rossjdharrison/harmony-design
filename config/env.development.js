/**
 * Development Environment Configuration
 * 
 * This file is loaded in development mode and provides
 * environment-specific overrides for local development.
 * 
 * @see {@link file://../core/environment.js}
 */

export default {
  name: 'development',
  logLevel: 'debug',
  api: {
    baseURL: 'http://localhost:3000'
  },
  features: {
    eventBusDebug: true,
    performanceMonitoring: true,
    componentGraph: true,
    experimentalFeatures: true
  }
};