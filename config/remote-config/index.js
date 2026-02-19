/**
 * @fileoverview Remote Config Module - Entry point for remote config functionality
 * @module config/remote-config
 * 
 * Exports remote config service and adapter for feature flag fetching.
 * 
 * Documentation: DESIGN_SYSTEM.md#remote-config
 */

export { RemoteConfigService, createRemoteConfigService } from './remote-config-service.js';
export { RemoteConfigAdapter, createRemoteConfigAdapter } from './remote-config-adapter.js';