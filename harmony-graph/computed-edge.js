/**
 * @fileoverview ComputedEdge - Edges that transform events as they propagate
 * 
 * Provides transformation capabilities for edges in the event graph:
 * - Map: Transform event payload
 * - Filter: Conditionally allow event propagation
 * - Reduce: Accumulate multiple events into single result
 * 
 * Related: harmony-graph/edge-subscription.js, harmony-graph/event-envelope.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Engine - Event Propagation
 * 
 * @module harmony-graph/computed-edge
 */

import { EventEnvelope } from './event-envelope.js';

/**
 * Transform types supported by computed edges
 * @enum {string}
 */
export const TransformType = {
  MAP: 'map',
  FILTER: 'filter',
  REDUCE: 'reduce',
  COMPOSE: 'compose'
};

/**
 * Edge that transforms events during propagation
 * 
 * Performance considerations:
 * - Transformations execute synchronously during propagation
 * - Complex transforms may impact 16ms render budget
 * - Reduce operations maintain state per edge instance
 * 
 * @class ComputedEdge
 * @example
 * // Map transformation
 * const edge = new ComputedEdge({
 *   type: TransformType.MAP,
 *   transform: (envelope) => ({
 *     ...envelope,
 *     payload: { value: envelope.payload.value * 2 }
 *   })
 * });
 * 
 * // Filter transformation
 * const filterEdge = new ComputedEdge({
 *   type: TransformType.FILTER,
 *   predicate: (envelope) => envelope.payload.value > 10
 * });
 * 
 * // Reduce transformation
 * const reduceEdge = new ComputedEdge({
 *   type: TransformType.REDUCE,
 *   reducer: (acc, envelope) => acc + envelope.payload.value,
 *   initialValue: 0,
 *   emitOn: 'count',
 *   emitThreshold: 5
 * });
 */
export class ComputedEdge {
  /**
   * @param {Object} config - Edge configuration
   * @param {string} config.id - Unique edge identifier
   * @param {string} config.sourceNodeId - Source node ID
   * @param {string} config.targetNodeId - Target node ID
   * @param {TransformType} config.type - Type of transformation
   * @param {Function} [config.transform] - Map function (envelope) => envelope
   * @param {Function} [config.predicate] - Filter function (envelope) => boolean
   * @param {Function} [config.reducer] - Reduce function (accumulator, envelope) => accumulator
   * @param {*} [config.initialValue] - Initial value for reducer
   * @param {string} [config.emitOn='count'] - When to emit reduced value ('count', 'time', 'manual')
   * @param {number} [config.emitThreshold=10] - Threshold for emission (count or ms)
   * @param {Array<Function>} [config.transforms] - Array of transforms for compose type
   */
  constructor(config) {
    this.id = config.id || `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.sourceNodeId = config.sourceNodeId;
    this.targetNodeId = config.targetNodeId;
    this.type = config.type;
    
    // Transform functions
    this.transform = config.transform;
    this.predicate = config.predicate;
    this.reducer = config.reducer;
    this.transforms = config.transforms || [];
    
    // Reduce state
    this.accumulator = config.initialValue;
    this.initialValue = config.initialValue;
    this.emitOn = config.emitOn || 'count';
    this.emitThreshold = config.emitThreshold || 10;
    this.eventCount = 0;
    this.lastEmitTime = Date.now();
    
    // Metrics
    this.metrics = {
      eventsProcessed: 0,
      eventsFiltered: 0,
      eventsEmitted: 0,
      totalTransformTime: 0,
      errors: 0
    };
    
    // Validation
    this._validate();
  }
  
  /**
   * Validate edge configuration
   * @private
   * @throws {Error} If configuration is invalid
   */
  _validate() {
    if (!this.sourceNodeId || !this.targetNodeId) {
      throw new Error('ComputedEdge requires sourceNodeId and targetNodeId');
    }
    
    switch (this.type) {
      case TransformType.MAP:
        if (typeof this.transform !== 'function') {
          throw new Error('MAP type requires transform function');
        }
        break;
      case TransformType.FILTER:
        if (typeof this.predicate !== 'function') {
          throw new Error('FILTER type requires predicate function');
        }
        break;
      case TransformType.REDUCE:
        if (typeof this.reducer !== 'function') {
          throw new Error('REDUCE type requires reducer function');
        }
        if (this.initialValue === undefined) {
          throw new Error('REDUCE type requires initialValue');
        }
        break;
      case TransformType.COMPOSE:
        if (!Array.isArray(this.transforms) || this.transforms.length === 0) {
          throw new Error('COMPOSE type requires transforms array');
        }
        break;
      default:
        throw new Error(`Unknown transform type: ${this.type}`);
    }
  }
  
  /**
   * Process event through edge transformation
   * 
   * @param {EventEnvelope} envelope - Event envelope to transform
   * @returns {EventEnvelope|null} Transformed envelope or null if filtered
   */
  process(envelope) {
    const startTime = performance.now();
    this.metrics.eventsProcessed++;
    
    try {
      let result;
      
      switch (this.type) {
        case TransformType.MAP:
          result = this._processMap(envelope);
          break;
        case TransformType.FILTER:
          result = this._processFilter(envelope);
          break;
        case TransformType.REDUCE:
          result = this._processReduce(envelope);
          break;
        case TransformType.COMPOSE:
          result = this._processCompose(envelope);
          break;
      }
      
      if (result) {
        this.metrics.eventsEmitted++;
      } else {
        this.metrics.eventsFiltered++;
      }
      
      const duration = performance.now() - startTime;
      this.metrics.totalTransformTime += duration;
      
      // Warn if transform is too slow (impacts 16ms budget)
      if (duration > 1) {
        console.warn(`ComputedEdge ${this.id} transform took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error(`ComputedEdge ${this.id} transform error:`, error);
      
      // On error, pass through original envelope with error flag
      return new EventEnvelope({
        event: envelope.event,
        source: envelope.source,
        metadata: {
          ...envelope.metadata,
          transformError: error.message,
          edgeId: this.id
        }
      });
    }
  }
  
  /**
   * Process MAP transformation
   * @private
   * @param {EventEnvelope} envelope
   * @returns {EventEnvelope}
   */
  _processMap(envelope) {
    const transformed = this.transform(envelope);
    
    // Ensure result is still an EventEnvelope
    if (!(transformed instanceof EventEnvelope)) {
      return new EventEnvelope({
        event: transformed.event || envelope.event,
        source: transformed.source || envelope.source,
        metadata: {
          ...envelope.metadata,
          ...transformed.metadata,
          transformedBy: this.id
        }
      });
    }
    
    return transformed;
  }
  
  /**
   * Process FILTER transformation
   * @private
   * @param {EventEnvelope} envelope
   * @returns {EventEnvelope|null}
   */
  _processFilter(envelope) {
    const passes = this.predicate(envelope);
    return passes ? envelope : null;
  }
  
  /**
   * Process REDUCE transformation
   * @private
   * @param {EventEnvelope} envelope
   * @returns {EventEnvelope|null}
   */
  _processReduce(envelope) {
    // Update accumulator
    this.accumulator = this.reducer(this.accumulator, envelope);
    this.eventCount++;
    
    // Check if should emit
    const shouldEmit = this._shouldEmitReduce();
    
    if (shouldEmit) {
      const result = new EventEnvelope({
        event: {
          ...envelope.event,
          type: `${envelope.event.type}.reduced`,
          payload: this.accumulator
        },
        source: this.id,
        metadata: {
          ...envelope.metadata,
          reducedFrom: this.eventCount,
          edgeId: this.id
        }
      });
      
      // Reset state
      this.accumulator = this.initialValue;
      this.eventCount = 0;
      this.lastEmitTime = Date.now();
      
      return result;
    }
    
    return null;
  }
  
  /**
   * Process COMPOSE transformation (chain multiple transforms)
   * @private
   * @param {EventEnvelope} envelope
   * @returns {EventEnvelope|null}
   */
  _processCompose(envelope) {
    let current = envelope;
    
    for (const transform of this.transforms) {
      if (!current) return null;
      
      if (typeof transform === 'function') {
        current = transform(current);
      } else if (transform.type === 'filter') {
        const passes = transform.predicate(current);
        if (!passes) return null;
      } else if (transform.type === 'map') {
        current = transform.transform(current);
      }
    }
    
    return current;
  }
  
  /**
   * Check if reduce should emit
   * @private
   * @returns {boolean}
   */
  _shouldEmitReduce() {
    switch (this.emitOn) {
      case 'count':
        return this.eventCount >= this.emitThreshold;
      case 'time':
        return (Date.now() - this.lastEmitTime) >= this.emitThreshold;
      case 'manual':
        return false;
      default:
        return this.eventCount >= this.emitThreshold;
    }
  }
  
  /**
   * Manually trigger reduce emission
   * @returns {EventEnvelope|null}
   */
  emitReduce() {
    if (this.type !== TransformType.REDUCE) {
      throw new Error('emitReduce only valid for REDUCE type edges');
    }
    
    if (this.eventCount === 0) {
      return null;
    }
    
    const result = new EventEnvelope({
      event: {
        type: 'manual.reduced',
        payload: this.accumulator
      },
      source: this.id,
      metadata: {
        reducedFrom: this.eventCount,
        edgeId: this.id,
        manualEmit: true
      }
    });
    
    // Reset state
    this.accumulator = this.initialValue;
    this.eventCount = 0;
    this.lastEmitTime = Date.now();
    
    return result;
  }
  
  /**
   * Reset reduce state
   */
  reset() {
    if (this.type === TransformType.REDUCE) {
      this.accumulator = this.initialValue;
      this.eventCount = 0;
      this.lastEmitTime = Date.now();
    }
  }
  
  /**
   * Get edge metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      averageTransformTime: this.metrics.eventsProcessed > 0
        ? this.metrics.totalTransformTime / this.metrics.eventsProcessed
        : 0,
      filterRate: this.metrics.eventsProcessed > 0
        ? this.metrics.eventsFiltered / this.metrics.eventsProcessed
        : 0
    };
  }
  
  /**
   * Serialize edge to JSON
   * @returns {Object} Serializable edge configuration
   */
  toJSON() {
    return {
      id: this.id,
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      type: this.type,
      emitOn: this.emitOn,
      emitThreshold: this.emitThreshold,
      metrics: this.getMetrics()
    };
  }
}

/**
 * Factory for creating common edge transformations
 */
export class EdgeTransforms {
  /**
   * Create a map edge that extracts specific payload field
   * @param {string} field - Field name to extract
   * @returns {Function} Transform function
   */
  static pluck(field) {
    return (envelope) => new EventEnvelope({
      event: {
        ...envelope.event,
        payload: envelope.event.payload[field]
      },
      source: envelope.source,
      metadata: envelope.metadata
    });
  }
  
  /**
   * Create a filter edge that checks payload field value
   * @param {string} field - Field name to check
   * @param {*} value - Expected value
   * @returns {Function} Predicate function
   */
  static equals(field, value) {
    return (envelope) => envelope.event.payload[field] === value;
  }
  
  /**
   * Create a filter edge that checks if payload field is within range
   * @param {string} field - Field name to check
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {Function} Predicate function
   */
  static inRange(field, min, max) {
    return (envelope) => {
      const val = envelope.event.payload[field];
      return val >= min && val <= max;
    };
  }
  
  /**
   * Create a map edge that scales numeric value
   * @param {string} field - Field name to scale
   * @param {number} factor - Scale factor
   * @returns {Function} Transform function
   */
  static scale(field, factor) {
    return (envelope) => new EventEnvelope({
      event: {
        ...envelope.event,
        payload: {
          ...envelope.event.payload,
          [field]: envelope.event.payload[field] * factor
        }
      },
      source: envelope.source,
      metadata: envelope.metadata
    });
  }
  
  /**
   * Create a reduce edge that sums numeric values
   * @param {string} field - Field name to sum
   * @returns {Function} Reducer function
   */
  static sum(field) {
    return (acc, envelope) => acc + (envelope.event.payload[field] || 0);
  }
  
  /**
   * Create a reduce edge that counts events
   * @returns {Function} Reducer function
   */
  static count() {
    return (acc) => acc + 1;
  }
  
  /**
   * Create a reduce edge that collects events into array
   * @param {number} [maxSize=100] - Maximum array size
   * @returns {Function} Reducer function
   */
  static collect(maxSize = 100) {
    return (acc, envelope) => {
      const arr = [...acc, envelope];
      return arr.length > maxSize ? arr.slice(-maxSize) : arr;
    };
  }
  
  /**
   * Create a map edge that debounces events
   * @param {number} delay - Debounce delay in ms
   * @returns {Object} Transform configuration
   */
  static debounce(delay) {
    let timeoutId = null;
    let lastEnvelope = null;
    
    return {
      type: 'debounce',
      delay,
      process: (envelope, emit) => {
        lastEnvelope = envelope;
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          emit(lastEnvelope);
          timeoutId = null;
        }, delay);
        
        return null; // Don't emit immediately
      }
    };
  }
  
  /**
   * Create a map edge that throttles events
   * @param {number} interval - Throttle interval in ms
   * @returns {Object} Transform configuration
   */
  static throttle(interval) {
    let lastEmitTime = 0;
    
    return {
      type: 'throttle',
      interval,
      process: (envelope) => {
        const now = Date.now();
        if (now - lastEmitTime >= interval) {
          lastEmitTime = now;
          return envelope;
        }
        return null;
      }
    };
  }
}