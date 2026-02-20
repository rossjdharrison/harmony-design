/**
 * Health Check System
 * 
 * Provides liveness and readiness probes for monitoring system health.
 * 
 * ## Usage
 * 
 * ### Service Worker Integration
 * 
 * ```javascript
 * import { createHealthCheckRouter } from './health/index.js';
 * 
 * const healthRouter = createHealthCheckRouter();
 * 
 * self.addEventListener('fetch', (event) => {
 *   const url = new URL(event.request.url);
 *   if (url.pathname.startsWith('/health')) {
 *     event.respondWith(healthRouter(event.request));
 *   }
 * });
 * ```
 * 
 * ### Custom Health Checks
 * 
 * ```javascript
 * import { getHealthCheckService } from './health/index.js';
 * 
 * const service = getHealthCheckService();
 * 
 * // Register custom liveness check
 * service.registerLivenessCheck('my-check', async () => {
 *   const isHealthy = await checkSomething();
 *   return {
 *     healthy: isHealthy,
 *     message: 'Custom check result'
 *   };
 * });
 * 
 * // Register custom readiness check
 * service.registerReadinessCheck('database', async () => {
 *   const connected = await db.ping();
 *   return {
 *     healthy: connected,
 *     message: connected ? 'Database connected' : 'Database unavailable'
 *   };
 * });
 * ```
 * 
 * ### UI Component
 * 
 * ```html
 * <harmony-health-check auto-refresh refresh-interval="5000"></harmony-health-check>
 * ```
 * 
 * ## Endpoints
 * 
 * - `/health/live` or `/healthz` - Liveness probe
 * - `/health/ready` or `/readyz` - Readiness probe
 * - `/health` or `/health/status` - Combined status
 * 
 * ## Response Format
 * 
 * ```json
 * {
 *   "healthy": true,
 *   "status": "healthy",
 *   "timestamp": 1234567890,
 *   "checks": {
 *     "runtime": {
 *       "healthy": true,
 *       "message": "Runtime operational",
 *       "duration": 1
 *     }
 *   }
 * }
 * ```
 * 
 * See DESIGN_SYSTEM.md § Health Monitoring for more details.
 */