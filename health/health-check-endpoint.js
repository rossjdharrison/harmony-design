/**
 * @fileoverview Health Check HTTP Endpoints
 * @module health/health-check-endpoint
 * 
 * Provides HTTP endpoint handlers for health checks.
 * Typically integrated with service workers or backend proxies.
 * 
 * Related: See DESIGN_SYSTEM.md § Health Monitoring
 */

import { getHealthCheckService } from './health-check-service.js';

/**
 * Handle liveness probe request
 * Returns 200 if application is alive, 503 if unhealthy
 * 
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleLivenessProbe(request) {
  const service = getHealthCheckService();
  
  try {
    const result = await service.checkLiveness();
    
    const status = result.healthy ? 200 : 503;
    
    return new Response(JSON.stringify(result, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      healthy: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    }, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * Handle readiness probe request
 * Returns 200 if application is ready, 503 if not ready
 * 
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleReadinessProbe(request) {
  const service = getHealthCheckService();
  
  try {
    const result = await service.checkReadiness();
    
    const status = result.healthy ? 200 : 503;
    
    return new Response(JSON.stringify(result, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      healthy: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    }, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * Handle health status request (combined view)
 * Always returns 200 with status information
 * 
 * @param {Request} request - HTTP request
 * @returns {Promise<Response>} HTTP response
 */
export async function handleHealthStatus(request) {
  const service = getHealthCheckService();
  
  try {
    const [liveness, readiness] = await Promise.all([
      service.checkLiveness(),
      service.checkReadiness()
    ]);
    
    const overall = liveness.healthy && readiness.healthy;
    
    return new Response(JSON.stringify({
      healthy: overall,
      liveness,
      readiness,
      timestamp: Date.now()
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      healthy: false,
      error: error.message,
      timestamp: Date.now()
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * Create health check router
 * Returns a function that routes health check requests
 * 
 * @returns {Function} Router function
 */
export function createHealthCheckRouter() {
  return async (request) => {
    const url = new URL(request.url);
    const path = url.pathname;
    
    if (path === '/health/live' || path === '/healthz') {
      return handleLivenessProbe(request);
    }
    
    if (path === '/health/ready' || path === '/readyz') {
      return handleReadinessProbe(request);
    }
    
    if (path === '/health' || path === '/health/status') {
      return handleHealthStatus(request);
    }
    
    return new Response('Not Found', { status: 404 });
  };
}