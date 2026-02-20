/**
 * Field-of-View Token Utilities
 * 
 * Utilities for working with camera field-of-view tokens in 3D rendering contexts.
 * Provides conversion, validation, and calculation functions.
 * 
 * Schema: harmony-schemas/schemas/field-of-view-token.schema.json
 * Types: types/tokens/field-of-view-token.d.ts
 * 
 * @module tokens/field-of-view-utils
 */

/**
 * Validates a field-of-view token structure
 * 
 * @param {unknown} token - Token to validate
 * @returns {boolean} True if valid field-of-view token
 */
export function isValidFieldOfViewToken(token) {
  if (typeof token !== 'object' || token === null) {
    return false;
  }

  if (token.$type !== 'fieldOfView') {
    return false;
  }

  const { value } = token;

  // Simple number value
  if (typeof value === 'number') {
    return value > 0 && value < 180;
  }

  // Token reference
  if (typeof value === 'string') {
    return /^\{[^}]+\}$/.test(value);
  }

  // Detailed FOV object
  if (typeof value === 'object' && value !== null) {
    if (typeof value.degrees !== 'number' || value.degrees <= 0 || value.degrees >= 180) {
      return false;
    }

    if (value.orientation !== undefined) {
      const validOrientations = ['vertical', 'horizontal', 'diagonal'];
      if (!validOrientations.includes(value.orientation)) {
        return false;
      }
    }

    if (value.aspectRatio !== undefined) {
      if (typeof value.aspectRatio !== 'number' || value.aspectRatio <= 0) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Extracts the numeric FOV value in degrees from a token
 * 
 * @param {object} token - Field-of-view token
 * @returns {number} FOV in degrees
 * @throws {Error} If token contains a reference (needs resolution)
 */
export function extractFOVDegrees(token) {
  if (!isValidFieldOfViewToken(token)) {
    throw new Error('Invalid field-of-view token');
  }

  const { value } = token;

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    throw new Error('Token reference requires resolution');
  }

  return value.degrees;
}

/**
 * Converts vertical FOV to horizontal FOV given an aspect ratio
 * 
 * @param {number} verticalFOV - Vertical field of view in degrees
 * @param {number} aspectRatio - Aspect ratio (width/height)
 * @returns {number} Horizontal field of view in degrees
 */
export function verticalToHorizontalFOV(verticalFOV, aspectRatio) {
  const vRadians = (verticalFOV * Math.PI) / 180;
  const hRadians = 2 * Math.atan(Math.tan(vRadians / 2) * aspectRatio);
  return (hRadians * 180) / Math.PI;
}

/**
 * Converts horizontal FOV to vertical FOV given an aspect ratio
 * 
 * @param {number} horizontalFOV - Horizontal field of view in degrees
 * @param {number} aspectRatio - Aspect ratio (width/height)
 * @returns {number} Vertical field of view in degrees
 */
export function horizontalToVerticalFOV(horizontalFOV, aspectRatio) {
  const hRadians = (horizontalFOV * Math.PI) / 180;
  const vRadians = 2 * Math.atan(Math.tan(hRadians / 2) / aspectRatio);
  return (vRadians * 180) / Math.PI;
}

/**
 * Calculates the complementary FOV dimension
 * 
 * @param {object} token - Field-of-view token with detailed value
 * @returns {object} Object with both vertical and horizontal FOV
 */
export function calculateComplementaryFOV(token) {
  if (!isValidFieldOfViewToken(token)) {
    throw new Error('Invalid field-of-view token');
  }

  const { value } = token;

  // Simple number defaults to vertical
  if (typeof value === 'number') {
    return { vertical: value, horizontal: null };
  }

  if (typeof value === 'string') {
    throw new Error('Token reference requires resolution');
  }

  const { degrees, orientation = 'vertical', aspectRatio } = value;

  if (!aspectRatio) {
    return orientation === 'vertical'
      ? { vertical: degrees, horizontal: null }
      : { vertical: null, horizontal: degrees };
  }

  if (orientation === 'vertical') {
    return {
      vertical: degrees,
      horizontal: verticalToHorizontalFOV(degrees, aspectRatio),
    };
  }

  if (orientation === 'horizontal') {
    return {
      vertical: horizontalToVerticalFOV(degrees, aspectRatio),
      horizontal: degrees,
    };
  }

  // Diagonal FOV calculation is more complex, return as-is
  return { vertical: null, horizontal: null, diagonal: degrees };
}

/**
 * Creates a simple field-of-view token
 * 
 * @param {number} degrees - FOV in degrees (0-180 exclusive)
 * @param {string} [description] - Optional description
 * @returns {object} Field-of-view token
 */
export function createFOVToken(degrees, description) {
  if (degrees <= 0 || degrees >= 180) {
    throw new Error('FOV must be between 0 and 180 degrees (exclusive)');
  }

  return {
    $type: 'fieldOfView',
    value: degrees,
    ...(description && { description }),
  };
}

/**
 * Creates a detailed field-of-view token with orientation and aspect ratio
 * 
 * @param {number} degrees - FOV in degrees
 * @param {string} orientation - 'vertical', 'horizontal', or 'diagonal'
 * @param {number} aspectRatio - Aspect ratio (width/height)
 * @param {string} [description] - Optional description
 * @returns {object} Field-of-view token
 */
export function createDetailedFOVToken(degrees, orientation, aspectRatio, description) {
  if (degrees <= 0 || degrees >= 180) {
    throw new Error('FOV must be between 0 and 180 degrees (exclusive)');
  }

  const validOrientations = ['vertical', 'horizontal', 'diagonal'];
  if (!validOrientations.includes(orientation)) {
    throw new Error(`Orientation must be one of: ${validOrientations.join(', ')}`);
  }

  if (aspectRatio <= 0) {
    throw new Error('Aspect ratio must be positive');
  }

  return {
    $type: 'fieldOfView',
    value: {
      degrees,
      orientation,
      aspectRatio,
    },
    ...(description && { description }),
  };
}

/**
 * Calculates perspective projection matrix parameters from FOV
 * 
 * @param {object} token - Field-of-view token
 * @param {number} near - Near clipping plane distance
 * @param {number} far - Far clipping plane distance
 * @returns {object} Projection parameters
 */
export function calculateProjectionParams(token, near, far) {
  if (!isValidFieldOfViewToken(token)) {
    throw new Error('Invalid field-of-view token');
  }

  const degrees = extractFOVDegrees(token);
  const fovRadians = (degrees * Math.PI) / 180;
  const f = 1.0 / Math.tan(fovRadians / 2);

  return {
    fov: degrees,
    fovRadians,
    f,
    near,
    far,
    range: far - near,
  };
}