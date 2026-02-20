/**
 * @fileoverview Health Check System - Main exports
 * @module health
 * 
 * Provides health check functionality for monitoring system health.
 * Includes liveness and readiness probes for Kubernetes-style health checks.
 * 
 * Related: See DESIGN_SYSTEM.md § Health Monitoring
 */

export { HealthCheckService, getHealthCheckService } from './health-check-service.js';
export { 
  handleLivenessProbe, 
  handleReadinessProbe, 
  handleHealthStatus,
  createHealthCheckRouter 
} from './health-check-endpoint.js';
export { HealthCheckComponent } from './health-check-component.js';