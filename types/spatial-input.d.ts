/**
 * Spatial Input Abstraction Type Definitions
 * 
 * TypeScript interfaces for gaze, controller, and hand tracking input primitives.
 * See docs/specs/spatial-input-abstraction.md for complete specification.
 * 
 * @module types/spatial-input
 */

/**
 * 3D vector in world space
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion rotation in world space
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * 3D ray with origin and direction
 */
export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

/**
 * 6DOF pose in world space
 */
export interface Pose {
  position: Vector3;
  orientation: Quaternion;
  linearVelocity?: Vector3;
  angularVelocity?: Vector3;
}

/**
 * Gaze input data structure
 * 
 * Represents eye tracking data including gaze ray, focus point,
 * and dwell time for interaction detection.
 */
export interface GazeInput {
  /** High-resolution timestamp in milliseconds */
  timestamp: number;
  
  /** 3D ray from eye origin through gaze point */
  eyeRay: Ray;
  
  /** Intersection point in world space, null if no hit */
  focusPoint: Vector3 | null;
  
  /** Duration of sustained gaze on current target (ms) */
  dwellTime: number;
  
  /** Tracking quality confidence (0.0 to 1.0) */
  confidence: number;
  
  /** Current blink state */
  blinkState: 'open' | 'closed' | 'transitioning';
}

/**
 * Controller button state
 */
export interface ButtonState {
  /** Button is currently pressed */
  pressed: boolean;
  
  /** Touch sensor is activated */
  touched: boolean;
  
  /** Analog value for pressure-sensitive buttons (0.0 to 1.0) */
  value: number;
}

/**
 * Motion controller input data structure
 * 
 * Represents 6DOF tracked controller with buttons, analog inputs,
 * and haptic feedback capabilities.
 */
export interface ControllerInput {
  /** High-resolution timestamp in milliseconds */
  timestamp: number;
  
  /** Controller hand assignment */
  handedness: 'left' | 'right' | 'unknown';
  
  /** 6DOF pose with velocity */
  pose: Pose;
  
  /** Button states keyed by button name */
  buttons: Record<string, ButtonState>;
  
  /** Analog axis values (-1.0 to 1.0) keyed by axis name */
  axes: Record<string, number>;
  
  /** Controller connection status */
  connected: boolean;
  
  /** Battery level (0.0 to 1.0), null if unavailable */
  batteryLevel: number | null;
}

/**
 * Hand joint data
 */
export interface HandJoint {
  /** Joint position in world space */
  position: Vector3;
  
  /** Joint orientation in world space */
  orientation: Quaternion;
  
  /** Joint collision sphere radius in meters */
  radius: number;
}

/**
 * Pinch gesture state
 */
export interface PinchState {
  /** Pinch is currently active (thumb touching finger) */
  active: boolean;
  
  /** Pinch strength (0.0 to 1.0) */
  strength: number;
  
  /** Pinch point position in world space */
  position: Vector3;
}

/**
 * Hand grip state
 */
export interface GripState {
  /** Grip strength (0.0 open to 1.0 closed) */
  strength: number;
}

/**
 * Hand tracking input data structure
 * 
 * Represents skeletal hand tracking with 25 joints per hand,
 * pinch detection, and grip strength.
 */
export interface HandInput {
  /** High-resolution timestamp in milliseconds */
  timestamp: number;
  
  /** Hand assignment */
  handedness: 'left' | 'right';
  
  /** Joint data keyed by joint name */
  joints: Record<string, HandJoint>;
  
  /** Pinch gesture state */
  pinch: PinchState;
  
  /** Grip state */
  grip: GripState;
  
  /** Tracking quality confidence (0.0 to 1.0) */
  confidence: number;
  
  /** Hand is within tracking volume */
  visible: boolean;
}

/**
 * Input source type discriminator
 */
export type InputSourceType = 'gaze' | 'controller' | 'hand';

/**
 * Input source handedness
 */
export type Handedness = 'left' | 'right' | 'none';

/**
 * Unified input source interface
 * 
 * Common interface implemented by all spatial input modalities.
 */
export interface InputSource {
  /** Unique identifier for this input source */
  id: string;
  
  /** Input source type */
  type: InputSourceType;
  
  /** Hand assignment if applicable */
  handedness?: Handedness;
  
  /** Connection status */
  connected: boolean;
  
  /** Set of available capability strings */
  capabilities: Set<string>;
  
  /**
   * Get current 6DOF pose
   * @returns Current pose or null if unavailable
   */
  getPose(): Pose | null;
  
  /**
   * Get current ray for pointing
   * @returns Current ray or null if unavailable
   */
  getRay(): Ray | null;
  
  /**
   * Subscribe to input source events
   */
  addEventListener(type: string, handler: (event: any) => void): void;
  
  /**
   * Unsubscribe from input source events
   */
  removeEventListener(type: string, handler: (event: any) => void): void;
}

/**
 * Input manager interface
 * 
 * Central manager for all spatial input sources.
 */
export interface InputManager {
  /**
   * Get all available input sources
   */
  getSources(): InputSource[];
  
  /**
   * Get input source by unique ID
   */
  getSourceById(id: string): InputSource | null;
  
  /**
   * Get all input sources of a specific type
   */
  getSourcesByType(type: InputSourceType): InputSource[];
  
  /**
   * Check if a capability is available on any input source
   */
  hasCapability(capability: string): boolean;
  
  /**
   * Get the preferred input source for the current context
   */
  getPreferredInputSource(): InputSource | null;
  
  /**
   * Subscribe to global input manager events
   */
  addEventListener(type: string, handler: (event: any) => void): void;
  
  /**
   * Unsubscribe from global input manager events
   */
  removeEventListener(type: string, handler: (event: any) => void): void;
}

/**
 * Spatial input event payload
 * 
 * Standard event structure for all spatial input events
 * published through EventBus.
 */
export interface SpatialInputEvent {
  /** Source information */
  source: {
    id: string;
    type: InputSourceType;
    handedness?: Handedness;
  };
  
  /** Event timestamp */
  timestamp: number;
  
  /** Input data (type varies by source) */
  data: GazeInput | ControllerInput | HandInput;
}

/**
 * Haptic feedback command
 */
export interface HapticCommand {
  /** Target input source ID */
  sourceId: string;
  
  /** Vibration intensity (0.0 to 1.0) */
  intensity: number;
  
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Standard gesture names
 */
export type GestureName = 
  | 'open_palm'
  | 'closed_fist'
  | 'pointing'
  | 'thumbs_up'
  | 'peace_sign'
  | 'pinch';

/**
 * Gesture recognition event
 */
export interface GestureEvent {
  /** Recognized gesture name */
  gesture: GestureName;
  
  /** Hand that performed gesture */
  handedness: 'left' | 'right';
  
  /** Recognition confidence (0.0 to 1.0) */
  confidence: number;
  
  /** Event timestamp */
  timestamp: number;
}